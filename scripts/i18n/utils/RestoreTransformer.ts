import ts from 'typescript';
import { ASTUtils } from './ASTUtils';
import { ImportManager } from './ImportManager';
import { MessageProcessor } from './MessageProcessor';
import { MessageInfo, TransformContext } from './types';

/**
 * 还原代码转换器
 * 负责将国际化代码还原为原始文本
 */
export class RestoreTransformer {
  /**
   * 转换formatMessage调用
   * @param node - 调用表达式节点
   * @param localeMap - 语言映射
   * @param definedMessages - 定义的消息映射
   * @param sourceFile - 源文件
   * @returns 转换后的节点或null
   */
  static transformFormatMessage(
    node: ts.CallExpression,
    localeMap: Record<string, string>,
    definedMessages: Map<string, MessageInfo>,
    sourceFile: ts.SourceFile,
  ): ts.Node | null {
    if (!ASTUtils.isFormatMessageCall(node)) {
      return null;
    }

    const messageInfo = ASTUtils.extractFormatMessageInfo(node, definedMessages, sourceFile);
    if (!MessageProcessor.isValidMessage(messageInfo)) {
      return null;
    }

    // 直接从localeMap获取模板，绕过可能导致"[object Object]"问题的字符串替换
    const messageTemplate = messageInfo.id ? localeMap[messageInfo.id] : undefined;

    // 如果模板不存在，则回退到 defaultMessage
    const templateToUse = messageTemplate ?? messageInfo.defaultMessage;
    if (templateToUse === undefined) {
      return null;
    }

    // 确保文本是正确的中文字符串，而不是Unicode编码
    return ASTUtils.createStringOrTemplateNode(templateToUse, messageInfo.values);
  }

  /**
   * 转换FormattedMessage组件
   * @param node - JSX元素或自闭合元素节点
   * @param localeMap - 语言映射
   * @param definedMessages - 定义的消息映射
   * @param sourceFile - 源文件
   * @returns 转换后的节点或null
   */
  static transformFormattedMessage(
    node: ts.JsxElement | ts.JsxSelfClosingElement,
    localeMap: Record<string, string>,
    definedMessages: Map<string, MessageInfo>,
    sourceFile: ts.SourceFile,
  ): ts.Node | null {
    const openingElement = ts.isJsxElement(node) ? node.openingElement : node;

    if (!ts.isIdentifier(openingElement.tagName) || openingElement.tagName.text !== 'FormattedMessage') {
      return null;
    }

    const messageInfo = ASTUtils.extractFormattedMessageInfo(openingElement, definedMessages, sourceFile);
    if (!MessageProcessor.isValidMessage(messageInfo)) {
      return null;
    }

    const messageTemplate = messageInfo.id ? localeMap[messageInfo.id] : undefined;
    const finalText = messageTemplate ?? messageInfo.defaultMessage ?? '';

    // 如果有values属性，则创建模板字符串
    if (messageInfo.values && Object.keys(messageInfo.values).length > 0) {
      return ASTUtils.createStringOrTemplateNode(finalText, messageInfo.values);
    }

    // 否则创建普通文本节点
    return ts.factory.createJsxText(finalText, false);
  }

  /**
   * 创建转换器
   * @param context - 转换上下文
   * @returns 转换器工厂函数
   */
  static createTransformer(context: TransformContext): ts.TransformerFactory<ts.SourceFile> {
    // 预备遍历，用于收集HOC组件的名称映射
    function prepass(node: ts.Node) {
      // 检查每个变量声明，而不是整个语句
      if (ts.isVariableDeclaration(node)) {
        if (
          ts.isIdentifier(node.name) &&
          node.initializer &&
          ts.isCallExpression(node.initializer) &&
          ts.isIdentifier(node.initializer.expression) &&
          node.initializer.expression.text === 'injectIntl' &&
          node.initializer.arguments.length > 0 &&
          ts.isIdentifier(node.initializer.arguments[0])
        ) {
          const wrappedName = node.name.text;
          const originalName = node.initializer.arguments[0].text;
          context.componentNameMap.set(wrappedName, originalName);
        }
      }
      ts.forEachChild(node, prepass);
    }
    prepass(context.sourceFile);

    return (transformationContext: ts.TransformationContext) => {
      const visit = (node: ts.Node): ts.Node | ts.Node[] => {
        let currentNode = node;

        // 顺序很重要
        // 1. 重命名组件引用
        currentNode = ImportManager.renameComponent(currentNode, context);
        if (currentNode !== node) {
          context.hasChanges = true;
        }

        // 2. 解除 injectIntl HOC (现在只做删除/解包)
        currentNode = ImportManager.unwrapInjectIntl(currentNode, context);
        if (currentNode !== node) {
          context.hasChanges = true;
        }

        // 3. 清理 WrappedComponentProps 类型引用
        currentNode = ImportManager.cleanupWrappedComponentProps(currentNode);
        if (currentNode !== node) {
          context.hasChanges = true;
        }

        let nodeChanged = false;

        // 转换formatMessage调用
        if (ts.isCallExpression(currentNode)) {
          const transformedNode = RestoreTransformer.transformFormatMessage(
            currentNode,
            context.localeMap,
            context.definedMessages,
            context.sourceFile,
          );
          if (transformedNode) {
            context.hasChanges = true;
            currentNode = transformedNode;
            nodeChanged = true;
          }
        }

        // 处理对象字面量中的formatMessage调用
        if (ts.isObjectLiteralExpression(currentNode)) {
          const transformedProperties: ts.ObjectLiteralElementLike[] = [];
          let objectChanged = false;

          for (const prop of currentNode.properties) {
            if (ts.isPropertyAssignment(prop)) {
              let newInitializer = prop.initializer;

              // 处理属性值中的formatMessage调用
              if (ts.isCallExpression(prop.initializer)) {
                const transformedCall = RestoreTransformer.transformFormatMessage(
                  prop.initializer,
                  context.localeMap,
                  context.definedMessages,
                  context.sourceFile,
                );
                if (transformedCall && ts.isExpression(transformedCall)) {
                  newInitializer = transformedCall;
                  objectChanged = true;
                }
              }

              if (newInitializer !== prop.initializer) {
                transformedProperties.push(ts.factory.createPropertyAssignment(prop.name, newInitializer));
              } else {
                transformedProperties.push(prop);
              }
            } else {
              transformedProperties.push(prop);
            }
          }

          if (objectChanged) {
            context.hasChanges = true;
            currentNode = ts.factory.createObjectLiteralExpression(transformedProperties);
            nodeChanged = true;
          }
        }

        // 如果没有转换为其他类型的节点，继续进行其他检查
        if (!nodeChanged) {
          // 转换FormattedMessage组件
          if (ts.isJsxElement(currentNode) || ts.isJsxSelfClosingElement(currentNode)) {
            const transformedNode = RestoreTransformer.transformFormattedMessage(
              currentNode,
              context.localeMap,
              context.definedMessages,
              context.sourceFile,
            );
            if (transformedNode) {
              context.hasChanges = true;
              currentNode = transformedNode;
              nodeChanged = true;
            }
          }

          // 清理导入 (现在由 unwrapInjectIntl 和其他清理共同完成)
          if (ts.isImportDeclaration(currentNode)) {
            const cleanedNode = ImportManager.cleanupImports(currentNode);
            if (cleanedNode !== currentNode) {
              context.hasChanges = true;
              currentNode = cleanedNode;
              nodeChanged = true;
            }
          }

          // 清理变量声明
          if (ts.isVariableStatement(currentNode)) {
            const cleanedNode = ImportManager.cleanupVariableStatements(currentNode);
            if (cleanedNode !== currentNode) {
              context.hasChanges = true;
              currentNode = cleanedNode;
              nodeChanged = true;
            }
          }

          // 清理Hook依赖数组（只对调用表达式进行）
          if (ts.isCallExpression(currentNode)) {
            const cleanedNode = ImportManager.cleanupHookDependencies(currentNode);
            if (cleanedNode !== currentNode) {
              context.hasChanges = true;
              currentNode = cleanedNode;
              nodeChanged = true;
            }
          }
        }

        // 继续递归遍历子节点
        return ts.visitEachChild(currentNode, visit, transformationContext);
      };

      return (sourceFile: ts.SourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
    };
  }
}
