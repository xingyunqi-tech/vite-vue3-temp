import ts from 'typescript';
import { LoggerUtils } from './LoggerUtils';
import { MessageInfo } from './types';

/**
 * AST工具类
 * 提供TypeScript AST操作功能
 */
export class ASTUtils {
  /**
   * 检查节点是否已经被国际化相关的调用或组件包裹
   * @param node - TypeScript AST节点
   * @returns 是否被国际化结构包裹
   */
  static isAlreadyInternationalized(node: ts.Node): boolean {
    // 向上遍历AST，检查父节点是否为国际化相关的结构
    let parent = node.parent;
    while (parent) {
      // Case 1: 在 `intl.formatMessage({...})` 调用中
      if (ts.isCallExpression(parent)) {
        const expression = parent.expression;
        // 匹配 `intl.formatMessage` 或 `.formatMessage`
        if (
          ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.name) &&
          expression.name.text === 'formatMessage'
        ) {
          return true;
        }
        // 匹配 `defineMessages`
        if (ts.isIdentifier(expression) && expression.text === 'defineMessages') {
          return true;
        }
      }

      // Case 2: 在 `<FormattedMessage />` 组件中
      // 可能是JSX属性...
      if (ts.isJsxAttribute(parent)) {
        // JsxAttribute -> JsxAttributes -> JsxOpening/SelfClosingElement
        const jsxElement = parent.parent.parent;
        if (ts.isJsxOpeningElement(jsxElement) || ts.isJsxSelfClosingElement(jsxElement)) {
          if (ts.isIdentifier(jsxElement.tagName) && jsxElement.tagName.text === 'FormattedMessage') {
            return true;
          }
        }
      }
      // ...或是组件的子节点
      if (ts.isJsxElement(parent)) {
        const openingElement = parent.openingElement;
        if (ts.isIdentifier(openingElement.tagName) && openingElement.tagName.text === 'FormattedMessage') {
          return true;
        }
      }

      // 优化: 在函数或类的边界停止遍历，避免匹配到外部作用域的无关调用
      if (ts.isBlock(parent) || ts.isFunctionLike(parent) || ts.isClassLike(parent)) {
        return false;
      }

      parent = parent.parent;
    }

    return false;
  }

  /**
   * 获取字符串字面量的值
   * @param node - TypeScript AST节点
   * @returns 字符串值，如果不是字符串字面量则返回undefined
   */
  static getStringLiteralValue(node: ts.Node): string | undefined {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }
    return undefined;
  }

  /**
   * 将AST节点转换为源代码文本
   * @param node - TypeScript AST节点
   * @param sourceFile - 源文件
   * @returns 源代码文本
   */
  static nodeToText(node: ts.Node, sourceFile: ts.SourceFile): string {
    return sourceFile.text.substring(node.getFullStart(), node.getEnd()).trim();
  }

  /**
   * 查找指定位置的节点
   * @param sourceFile - 源文件
   * @param position - 位置
   * @returns 找到的节点，如果没找到则返回undefined
   */
  static findNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
    function find(node: ts.Node): ts.Node | undefined {
      if (position >= node.getFullStart() && position < node.getEnd()) {
        return ts.forEachChild(node, find) || node;
      }
      return undefined;
    }
    return find(sourceFile);
  }

  /**
   * 获取节点上下文类型
   * @param node - TypeScript AST节点
   * @returns 上下文类型
   */
  static getNodeContext(node: ts.Node): 'jsx-text' | 'jsx-attribute' | 'js-code' {
    if (ts.isJsxText(node)) {
      return 'jsx-text';
    }

    let parent = node.parent;
    while (parent) {
      // 直接在JSX属性中
      if (ts.isJsxAttribute(parent)) {
        return 'jsx-attribute';
      }
      // 在JSX表达式中，且该表达式的父节点是JSX属性
      if (ts.isJsxExpression(parent) && parent.parent && ts.isJsxAttribute(parent.parent)) {
        return 'jsx-attribute';
      }
      // 检查是否是JSX属性的初始化值
      if (ts.isJsxAttribute(parent) && parent.initializer === node) {
        return 'jsx-attribute';
      }
      // 检查字符串字面量是否直接作为JSX属性值
      if (ts.isStringLiteral(node) && ts.isJsxAttribute(parent) && parent.initializer === node) {
        return 'jsx-attribute';
      }
      parent = parent.parent;
    }

    return 'js-code';
  }

  /**
   * 提取对象字面量中的属性值
   * @param node - 对象字面量表达式节点
   * @param sourceFile - 源文件（可选）
   * @returns 属性键值对
   */
  static extractObjectLiteralProperties(
    node: ts.ObjectLiteralExpression,
    sourceFile?: ts.SourceFile,
  ): Record<string, any> {
    const props: Record<string, any> = {};

    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property)) {
        const key = this.getPropertyKey(property.name);
        if (key) {
          props[key] = this.getPropertyValue(property.initializer, sourceFile);
        }
      }
    }

    return props;
  }

  /**
   * 获取属性键名
   * @param name - 属性名节点
   * @returns 属性键名
   */
  private static getPropertyKey(name: ts.PropertyName): string | undefined {
    if (ts.isIdentifier(name)) {
      return name.text;
    } else if (ts.isStringLiteral(name)) {
      return name.text;
    }
    return undefined;
  }

  /**
   * 获取属性值
   * @param initializer - 初始化表达式
   * @param sourceFile - 源文件（可选）
   * @returns 属性值
   */
  private static getPropertyValue(initializer: ts.Expression, sourceFile?: ts.SourceFile): any {
    const stringValue = this.getStringLiteralValue(initializer);

    if (stringValue !== undefined) {
      return stringValue;
    } else if (ts.isNumericLiteral(initializer)) {
      return Number(initializer.text);
    } else if (
      ts.isIdentifier(initializer) ||
      ts.isPropertyAccessExpression(initializer) ||
      ts.isCallExpression(initializer)
    ) {
      // 保存完整的表达式，包括表达式文本
      if (sourceFile) {
        return {
          node: initializer,
          text: this.nodeToText(initializer, sourceFile),
        };
      }
      return initializer;
    } else if (sourceFile) {
      // 对于其他复杂表达式，返回其文本形式
      const expressionText = this.nodeToText(initializer, sourceFile);
      return `{{${expressionText}}}`;
    }

    return undefined;
  }

  /**
   * 检查节点是否在console调用中
   * @param node - TypeScript AST节点
   * @returns 是否在console调用中
   */
  static isInConsoleCall(node: ts.Node): boolean {
    let parent = node.parent;
    while (parent) {
      if (ts.isCallExpression(parent)) {
        const expression = parent.expression;
        if (ts.isPropertyAccessExpression(expression)) {
          const object = expression.expression;
          if (ts.isIdentifier(object) && object.text === 'console') {
            return true;
          }
        }
      }
      parent = parent.parent;
    }
    return false;
  }

  /**
   * 获取文件类型
   * @param filePath - 文件路径
   * @param sourceText - 源代码
   * @returns 脚本类型
   */
  static getScriptKind(filePath: string): ts.ScriptKind {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      return ts.ScriptKind.TSX;
    }
    return ts.ScriptKind.TS;
  }

  /**
   * 从表达式文本中提取一个合理的变量名
   * @param expressionText - 表达式的源代码文本
   * @returns 合理的变量名
   */
  static getVariableNameFromExpression(expressionText: string): string {
    // 移除函数调用括号和参数，例如 .toFixed(1) -> ''
    let baseName = expressionText.replace(/\(.*\)/g, '');
    // 移除可选链操作符
    baseName = baseName.replace(/\?\.|\?/g, '.');
    // 按属性访问分割
    const parts = baseName.split('.').filter(p => p.trim() !== '');
    // 取最后一部分
    let key = parts[parts.length - 1] || 'val';
    // 移除任何非字母数字下划线的字符
    key = key.replace(/[^a-zA-Z0-9_]/g, '');
    // 如果名称以数字开头，加上前缀
    if (/^[0-9]/.test(key)) {
      key = `val_${key}`;
    }
    return key;
  }

  /**
   * 为区域设置文件(JSON)和defaultMessage创建消息字符串
   * @param originalText - 原始文本，可能包含引号
   * @param templateVariables - 从模板字符串中提取的变量表达式数组
   * @returns 一个包含格式化消息和占位符映射的对象
   */
  static createMessageWithOptions(
    originalText: string,
    templateVariables?: string[],
  ): { message: string; placeholderMap: Map<string, string> } {
    const placeholderMap = new Map<string, string>();
    // 移除原始文本两端的引号或反引号
    let message = originalText.replace(/^['"`]|['"`]$/g, '');

    if (templateVariables && templateVariables.length > 0) {
      const usedNames = new Set<string>();

      templateVariables.forEach(variableExpr => {
        let key = this.getVariableNameFromExpression(variableExpr);
        const originalKey = key;
        let count = 1;

        while (usedNames.has(key)) {
          key = `${originalKey}${count++}`;
        }

        usedNames.add(key);
        placeholderMap.set(variableExpr, key);
      });

      // 将模板字符串中的 ${...} 替换为 {key}
      placeholderMap.forEach((placeholder, expression) => {
        message = message.replace(`\${${expression}}`, `{${placeholder}}`);
      });
    }

    return { message, placeholderMap };
  }

  /**
   * @method getComponentType
   * @description 递归向上查找父节点，以确定给定节点所在的React组件上下文类型。
   * @param {ts.Node} node - TypeScript AST节点。
   * @returns {'function' | 'class' | 'other'} - 返回组件类型：'function'（函数组件）、'class'（类组件）或'other'（非React组件上下文）。
   */
  static getComponentType(node: ts.Node): 'function' | 'class' | 'other' {
    let current: ts.Node | undefined = node;
    while (current) {
      if (ts.isClassDeclaration(current)) {
        if (this.isClassComponent(current)) {
          return 'class';
        }
      }
      if (ts.isFunctionDeclaration(current) || ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
        if (this.isFunctionComponent(current)) {
          return 'function';
        }
      }
      current = current.parent;
    }
    return 'other';
  }

  /**
   * @method isClassComponent
   * @description 检查一个类声明节点是否是一个React类组件。
   *
   * 主要通过检查它是否继承自`React.Component`或`React.PureComponent`来判断。
   *
   * @param {ts.ClassDeclaration} node - 类声明节点。
   * @returns {boolean} - 如果是React类组件，则返回`true`。
   */
  static isClassComponent(node: ts.ClassDeclaration): boolean {
    // 检查是否有extends子句
    if (!node.heritageClauses) {
      return false;
    }

    for (const clause of node.heritageClauses) {
      if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
        for (const type of clause.types) {
          const expression = type.expression;

          // 检查是否继承自 Component
          if (ts.isIdentifier(expression) && ['Component', 'PureComponent'].includes(expression.text)) {
            return true;
          }

          // 检查是否继承自 React.Component
          if (
            ts.isPropertyAccessExpression(expression) &&
            ts.isIdentifier(expression.expression) &&
            expression.expression.text === 'React' &&
            ts.isIdentifier(expression.name) &&
            ['Component', 'PureComponent'].includes(expression.name.text)
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * @method isFunctionComponent
   * @description 检查一个函数或箭头函数节点是否是一个React函数组件。
   *
   * 判断依据包括：
   * 1. 是否被`React.forwardRef`或`React.memo`包裹。
   * 2. 函数体内是否使用了React Hooks（如`useState`, `useEffect`等）。
   * 3. 函数体内是否包含JSX元素。
   * 4. 是否有明确的React相关返回类型（如`React.ReactElement`, `JSX.Element`）。
   *
   * @param {ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression} node - 函数相关的AST节点。
   * @returns {boolean} - 如果是React函数组件，则返回`true`。
   */
  static isFunctionComponent(node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression): boolean {
    // 检查是否被 forwardRef 或 memo 包裹
    if (
      node.parent &&
      ts.isCallExpression(node.parent) &&
      ts.isIdentifier(node.parent.expression) &&
      ['forwardRef', 'memo'].includes(node.parent.expression.text)
    ) {
      return true;
    }

    let isReactFunction = false;

    const reactHooks = new Set([
      'useState',
      'useEffect',
      'useContext',
      'useReducer',
      'useCallback',
      'useMemo',
      'useRef',
      'useImperativeHandle',
      'useLayoutEffect',
      'useDebugValue',
      'useIntl',
    ]);

    const visit = (n: ts.Node) => {
      if (isReactFunction) return; // 提前退出

      // 检查是否调用了React Hook
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        if (reactHooks.has(n.expression.text)) {
          isReactFunction = true;
          return;
        }
      }

      // 检查是否存在JSX
      if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
        isReactFunction = true;
        return;
      }

      ts.forEachChild(n, visit);
    };

    if (node.body) {
      visit(node.body);
    }

    // Check for explicit return type
    if (!isReactFunction && node.type) {
      const typeText = node.type.getText();
      if (
        typeText.includes('React.ReactElement') ||
        typeText.includes('React.ReactNode') ||
        typeText.includes('JSX.Element')
      ) {
        isReactFunction = true;
      }
    }

    return isReactFunction;
  }

  /**
   * @method isComponentName
   * @description 检查给定的名称是否符合React组件的命名规范（首字母大写）。
   * @param {string} name - 要检查的名称。
   * @returns {boolean} - 如果符合命名规范，则返回`true`。
   */
  static isComponentName(name: string): boolean {
    return /^[A-Z]/.test(name);
  }

  /**
   * @method getComponentInfo
   * @description 从给定的AST节点中提取React组件的关键信息。
   *
   * 此方法能够识别不同方式声明的类组件和函数组件（包括变量声明、函数声明、默认导出等），
   * 并返回一个包含组件名称、类型和对应AST节点的对象。
   *
   * @param {ts.Node} node - 要分析的AST节点。
   * @returns {{ name: string; type: 'class' | 'function'; node: ts.ClassDeclaration | ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression } | undefined} - 如果找到组件，则返回组件信息对象，否则返回`undefined`。
   */
  static getComponentInfo(node: ts.Node):
    | {
        name: string;
        type: 'class' | 'function';
        node: ts.ClassDeclaration | ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression;
      }
    | undefined {
    // Class Components
    if (ts.isClassDeclaration(node) && node.name && this.isClassComponent(node)) {
      if (this.isComponentName(node.name.text)) {
        return { name: node.name.text, type: 'class', node };
      }
    }

    // Function Components from Variable Declaration
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && this.isComponentName(node.name.text)) {
      if (node.initializer) {
        const funcNode = this.getFunctionNodeFromInitializer(node.initializer);
        if (funcNode && this.isFunctionComponent(funcNode)) {
          return { name: node.name.text, type: 'function', node: funcNode };
        }
      }
    }

    // Function Components from Function Declaration
    if (ts.isFunctionDeclaration(node) && node.name && this.isComponentName(node.name.text)) {
      if (this.isFunctionComponent(node)) {
        return { name: node.name.text, type: 'function', node };
      }
    }

    // Function Components from Export Assignment (export default)
    if (ts.isExportAssignment(node) && !node.isExportEquals && node.expression) {
      const funcNode = this.getFunctionNodeFromInitializer(node.expression);
      if (funcNode && this.isFunctionComponent(funcNode)) {
        // A simple way to get a name for a default export is from the file path
        const name = 'DefaultExportedComponent'; // Placeholder name
        return { name, type: 'function', node: funcNode };
      }
    }

    return undefined;
  }

  /**
   * @method getFunctionNodeFromInitializer
   * @private
   * @description 从一个表达式（通常是变量初始值或导出表达式）中提取出函数节点。
   *
   * 此方法主要用于处理被`forwardRef`或`memo`等HOC包裹的函数组件。
   *
   * @param {ts.Expression} initializer - 初始值或导出表达式。
   * @returns {ts.ArrowFunction | ts.FunctionExpression | undefined} - 如果找到，返回函数节点，否则返回`undefined`。
   */
  private static getFunctionNodeFromInitializer(
    initializer: ts.Expression,
  ): ts.ArrowFunction | ts.FunctionExpression | undefined {
    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
      return initializer;
    }
    if (
      ts.isCallExpression(initializer) &&
      ts.isIdentifier(initializer.expression) &&
      ['forwardRef', 'memo'].includes(initializer.expression.text)
    ) {
      const arg = initializer.arguments[0];
      if (arg && (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg))) {
        return arg;
      }
    }
    return undefined;
  }

  /**
   * 根据消息文本和变量值，创建一个字符串字面量或模板表达式节点
   * @param messageText - 从语言文件中获取的、包含占位符的消息文本
   * @param values - 包含变量名到其原始AST节点映射的对象
   * @returns 创建的字符串字面量或模板表达式节点
   */
  static createStringOrTemplateNode(messageText: string, values?: Record<string, any>): ts.Node {
    // 如果没有变量，则必定是简单字符串
    if (!values || Object.keys(values).length === 0) {
      return ts.factory.createStringLiteral(messageText);
    }

    // 正则表达式按 {...} 分割字符串，保留字面量部分
    const literalParts: string[] = [];
    const placeholderNames: string[] = [];
    const regex = /\{([^}]+)\}/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(messageText)) !== null) {
      literalParts.push(messageText.substring(lastIndex, match.index));
      placeholderNames.push(match[1]); // e.g., 'name' from '{name}'
      lastIndex = match.index + match[0].length;
    }
    literalParts.push(messageText.substring(lastIndex));

    // 如果分割后没有有效的占位符
    if (placeholderNames.length === 0) {
      return ts.factory.createStringLiteral(messageText);
    }

    // 安全检查：占位符的数量必须等于变量的数量
    if (placeholderNames.length !== Object.keys(values).length) {
      LoggerUtils.warn(
        `[Restore Warning] Mismatch between placeholders (${placeholderNames.length}) and variables (${
          Object.keys(values).length
        }). Returning raw string. Template: "${messageText}"`,
      );
      return ts.factory.createStringLiteral(messageText);
    }

    const templateSpans: ts.TemplateSpan[] = [];
    const headText = literalParts[0]; // 第一个部分总是模板头

    // 按顺序迭代，将占位符名称映射到变量
    for (let i = 0; i < placeholderNames.length; i++) {
      const placeholderName = placeholderNames[i];
      const expressionNode = this.findExpressionForVariable(placeholderName, values);
      const literal = literalParts[i + 1] || ''; // 获取当前占位符之后的字面量

      // 如果找不到对应的变量，就回退，避免生成错误代码
      if (!expressionNode) {
        LoggerUtils.warn(
          `[Restore Warning] Could not find expression for placeholder "{${placeholderName}}". Returning raw string.`,
        );
        return ts.factory.createStringLiteral(messageText);
      }

      if (i === placeholderNames.length - 1) {
        // 这是最后一个变量，创建模板尾
        templateSpans.push(ts.factory.createTemplateSpan(expressionNode, ts.factory.createTemplateTail(literal)));
      } else {
        // 创建模板中间部分
        templateSpans.push(ts.factory.createTemplateSpan(expressionNode, ts.factory.createTemplateMiddle(literal)));
      }
    }

    return ts.factory.createTemplateExpression(ts.factory.createTemplateHead(headText), templateSpans);
  }

  /**
   * 从values映射中查找变量名对应的AST表达式节点
   * @param varName - 在消息模板中定义的变量名 (例如 'name')
   * @param values - 从formatMessage调用中提取的、包含变量名到AST节点映射的对象
   * @returns 对应的AST表达式节点，如果找不到则返回undefined
   */
  private static findExpressionForVariable(varName: string, values: Record<string, any>): ts.Expression | undefined {
    const value = values[varName];

    // 检查值是否是包含节点和文本的对象
    if (value && typeof value === 'object') {
      if ('node' in value && 'text' in value) {
        // 使用原始表达式节点
        return value.node as ts.Expression;
      } else if ('kind' in value) {
        // 直接是AST节点
        return value as ts.Expression;
      }
    }

    return undefined;
  }

  /**
   * 解析源代码为AST
   * @param sourceText - 源代码文本
   * @param filePath - 文件路径
   * @returns TypeScript源文件对象
   */
  static parseSourceFile(sourceText: string, filePath: string): ts.SourceFile {
    return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ASTUtils.getScriptKind(filePath));
  }

  /**
   * 替换代码中的字符串
   * @param sourceText - 源代码文本
   * @param replacements - 替换项列表
   * @returns 替换后的代码
   */
  static applyReplacements(
    sourceText: string,
    replacements: Array<{ start: number; end: number; replacement: string }>,
  ): string {
    if (replacements.length === 0) {
      return sourceText;
    }

    let result = sourceText;

    // 检查重叠并去重
    const validReplacements = replacements.filter((replacement, index) => {
      // 检查与其他替换是否重叠
      return !replacements.some((other, otherIndex) => {
        if (index === otherIndex) return false;

        return (
          (replacement.start >= other.start && replacement.start < other.end) ||
          (replacement.end > other.start && replacement.end <= other.end) ||
          (replacement.start <= other.start && replacement.end >= other.end)
        );
      });
    });

    // 按位置倒序排列，从后往前替换
    validReplacements.sort((a, b) => b.start - a.start);

    // 应用替换
    for (const { start, end, replacement } of validReplacements) {
      result = result.substring(0, start) + replacement + result.substring(end);
    }

    return result;
  }

  /**
   * 根据节点上下文，判断生成的i18n调用是否需要用 `{}` 包裹起来
   * @param node - 原始AST节点
   * @param context - 字符串的上下文 ('jsx-text', 'jsx-attribute', 'js-code')
   * @returns 如果需要JSX表达式包裹，则返回true
   */
  static needsJsxWrapper(node: ts.Node, context: 'jsx-text' | 'jsx-attribute' | 'js-code'): boolean {
    // JSX文本总是需要{}包裹
    if (context === 'jsx-text') {
      return true;
    }

    // 对于JSX属性，需要特别处理
    if (context === 'jsx-attribute') {
      // 检查是否已经在JSX表达式中
      let parent = node.parent;
      while (parent) {
        // 如果已经在JSX表达式中，不需要额外包裹
        if (ts.isJsxExpression(parent)) {
          return false;
        }
        // 如果是JSX属性值，需要包裹
        if (ts.isJsxAttribute(parent)) {
          return true;
        }
        parent = parent.parent;
      }
      // 默认情况下，JSX属性需要包裹
      return true;
    }

    // 对于其他所有类型的代码，检查上下文
    let parent = node.parent;
    while (parent) {
      // 已经在JSX表达式中，不需要额外包裹
      if (ts.isJsxExpression(parent)) {
        return false;
      }
      // 在对象字面量的属性值中，不需要{}包裹
      if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
        return false;
      }
      // 在函数调用的参数中，不需要{}包裹
      if (ts.isCallExpression(parent) && parent.arguments.includes(node as ts.Expression)) {
        return false;
      }
      // 在数组字面量中，不需要{}包裹
      if (ts.isArrayLiteralExpression(parent) && parent.elements.includes(node as ts.Expression)) {
        return false;
      }
      // 在变量声明的初始化器中，不需要{}包裹
      if (ts.isVariableDeclaration(parent) && parent.initializer === node) {
        return false;
      }
      parent = parent.parent;
    }

    // 默认不需要{}包裹
    return false;
  }

  // ==================== react-intl-related
  /**
   * 检查是否是formatMessage调用
   * @param node - 调用表达式节点
   * @returns 是否是formatMessage调用
   */
  static isFormatMessageCall(node: ts.CallExpression): boolean {
    // 检查 intl.formatMessage 或 this.props.intl.formatMessage 形式
    if (ts.isPropertyAccessExpression(node.expression)) {
      const propName = node.expression.name;
      if (ts.isIdentifier(propName) && propName.text === 'formatMessage') {
        return true;
      }
    }

    return false;
  }

  /**
   * 提取formatMessage的消息信息
   * @param node - 调用表达式节点
   * @param definedMessages - 定义的消息映射
   * @param sourceFile - 源文件
   * @returns 消息信息
   */
  static extractFormatMessageInfo(
    node: ts.CallExpression,
    definedMessages: Map<string, MessageInfo>,
    sourceFile: ts.SourceFile,
  ): MessageInfo {
    const arg = node.arguments[0];
    if (!arg) return {};

    let messageInfo: MessageInfo = {};

    if (ts.isObjectLiteralExpression(arg)) {
      const props = ASTUtils.extractObjectLiteralProperties(arg, sourceFile);
      messageInfo = {
        id: props.id,
        defaultMessage: props.defaultMessage,
      };

      // 处理第二个参数（变量值）
      const valuesArg = node.arguments[1];
      if (valuesArg && ts.isObjectLiteralExpression(valuesArg)) {
        messageInfo.values = ASTUtils.extractObjectLiteralProperties(valuesArg, sourceFile);
      }
    } else if (this.isMessageReference(arg)) {
      messageInfo = this.resolveMessageReference(arg as ts.PropertyAccessExpression, definedMessages);

      // 处理第二个参数（变量值）
      const valuesArg = node.arguments[1];
      if (valuesArg && ts.isObjectLiteralExpression(valuesArg)) {
        messageInfo.values = ASTUtils.extractObjectLiteralProperties(valuesArg, sourceFile);
      }
    }

    return messageInfo;
  }

  /**
   * 提取FormattedMessage的消息信息
   * @param openingElement - 开始元素或自闭合元素
   * @param definedMessages - 定义的消息映射
   * @param sourceFile - 源文件
   * @returns 消息信息
   */
  static extractFormattedMessageInfo(
    openingElement: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
    definedMessages: Map<string, MessageInfo>,
    sourceFile: ts.SourceFile,
  ): MessageInfo {
    let messageInfo: MessageInfo = {};

    for (const attribute of openingElement.attributes.properties) {
      if (ts.isJsxSpreadAttribute(attribute)) {
        const spreadMessage = this.handleSpreadAttribute(attribute, definedMessages);
        if (spreadMessage) {
          messageInfo = { ...messageInfo, ...spreadMessage };
        }
      } else if (ts.isJsxAttribute(attribute) && ts.isIdentifier(attribute.name)) {
        this.handleJsxAttribute(attribute, messageInfo, definedMessages, sourceFile);
      }
    }

    return messageInfo;
  }

  /**
   * 处理JSX展开属性，从中提取消息定义
   * @param attribute - JSX展开属性节点
   * @param definedMessages - 预先定义的消息映射
   * @returns 从展开属性中解析出的消息信息，如果无法解析则返回null
   */
  private static handleSpreadAttribute(
    attribute: ts.JsxSpreadAttribute,
    definedMessages: Map<string, MessageInfo>,
  ): MessageInfo | null {
    if (
      ts.isPropertyAccessExpression(attribute.expression) &&
      ts.isIdentifier(attribute.expression.expression) &&
      attribute.expression.expression.text.includes('MESSAGE') &&
      ts.isIdentifier(attribute.expression.name)
    ) {
      const messageKey = attribute.expression.name.text;
      return definedMessages.get(messageKey) || null;
    }
    return null;
  }

  /**
   * 处理单个JSX属性，提取id, defaultMessage, values等信息
   * @param attribute - JSX属性节点
   * @param messageInfo - 用于收集消息信息的对象
   * @param definedMessages - 预先定义的消息映射
   * @param sourceFile - 源文件
   */
  private static handleJsxAttribute(
    attribute: ts.JsxAttribute,
    messageInfo: MessageInfo,
    definedMessages: Map<string, MessageInfo>,
    sourceFile: ts.SourceFile,
  ): void {
    const attrName = (attribute.name as ts.Identifier).text;

    switch (attrName) {
      case 'id':
        messageInfo.id = this.extractJsxAttributeValue(attribute, definedMessages);
        break;
      case 'defaultMessage':
        messageInfo.defaultMessage = this.extractJsxAttributeValue(attribute, definedMessages);
        break;
      case 'values':
        if (
          attribute.initializer &&
          ts.isJsxExpression(attribute.initializer) &&
          attribute.initializer.expression &&
          ts.isObjectLiteralExpression(attribute.initializer.expression)
        ) {
          messageInfo.values = ASTUtils.extractObjectLiteralProperties(attribute.initializer.expression, sourceFile);
        }
        break;
    }
  }

  /**
   * 从JSX属性中提取其最终的字符串值
   * @param attribute - JSX属性节点
   * @param definedMessages - 预先定义的消息映射
   * @param sourceFile - 源文件
   * @returns 属性的字符串值，如果无法解析则返回undefined
   */
  private static extractJsxAttributeValue(
    attribute: ts.JsxAttribute,
    definedMessages: Map<string, MessageInfo>,
  ): string | undefined {
    if (!attribute.initializer) return undefined;

    if (ts.isStringLiteral(attribute.initializer)) {
      return attribute.initializer.text;
    } else if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
      return this.extractExpressionValue(attribute.initializer.expression, definedMessages);
    }

    return undefined;
  }

  /**
   * 从表达式中提取其最终的字符串值，支持从预定义消息中解析
   * @param expression - 表达式节点
   * @param definedMessages - 预先定义的消息映射
   * @returns 表达式的字符串值，如果无法解析则返回undefined
   */
  private static extractExpressionValue(
    expression: ts.Expression,
    definedMessages: Map<string, MessageInfo>,
  ): string | undefined {
    if (ts.isPropertyAccessExpression(expression)) {
      if (
        ts.isIdentifier(expression.expression) &&
        expression.expression.text.includes('MESSAGE') &&
        ts.isIdentifier(expression.name)
      ) {
        const messageKey = expression.name.text;
        const definedMessage = definedMessages.get(messageKey);
        return definedMessage?.id || definedMessage?.defaultMessage;
      }

      // 处理 MESSAGES.key.property 的情况
      if (
        ts.isPropertyAccessExpression(expression.expression) &&
        ts.isIdentifier(expression.expression.expression) &&
        expression.expression.expression.text.includes('MESSAGE') &&
        ts.isIdentifier(expression.expression.name) &&
        ts.isIdentifier(expression.name)
      ) {
        const messageKey = expression.expression.name.text;
        const propertyName = expression.name.text;
        const definedMessage = definedMessages.get(messageKey);

        if (propertyName === 'id') {
          return definedMessage?.id;
        } else if (propertyName === 'defaultMessage') {
          return definedMessage?.defaultMessage;
        }
      }
    }

    return undefined;
  }

  /**
   * 检查一个表达式是否是对预定义消息的引用
   * @param arg - 表达式节点
   * @returns 如果是消息引用则返回true，否则返回false
   */
  private static isMessageReference(arg: ts.Expression): boolean {
    return (
      ts.isPropertyAccessExpression(arg) &&
      ts.isIdentifier(arg.expression) &&
      arg.expression.text.includes('MESSAGE') &&
      ts.isIdentifier(arg.name)
    );
  }

  /**
   * 解析对预定义消息的引用，并返回其消息信息
   * @param arg - 属性访问表达式节点
   * @param definedMessages - 预先定义的消息映射
   * @returns 解析出的消息信息
   */
  private static resolveMessageReference(
    arg: ts.PropertyAccessExpression,
    definedMessages: Map<string, MessageInfo>,
  ): MessageInfo {
    const messageKey = arg.name.text;
    return definedMessages.get(messageKey) || {};
  }

  /**
   * 基于位置和原始文本，在源文件中查找最精确的字符串、模板或JSX文本节点
   * @param sourceFile - 源文件AST
   * @param position - 字符串在源文件中的起始位置
   * @param originalText - 字符串的原始文本
   * @returns 找到的AST节点，如果找不到则返回undefined
   */
  static findExactStringNode(sourceFile: ts.SourceFile, position: number, originalText: string): ts.Node | undefined {
    const node = ASTUtils.findNodeAtPosition(sourceFile, position);
    if (!node) return undefined;

    // 检查是否是JSX混合内容（模板字符串格式）
    if (originalText.startsWith('`') && originalText.endsWith('`')) {
      // 查找包含该位置的JSX元素
      let parent = node;
      while (parent) {
        if (ts.isJsxElement(parent)) {
          // 验证这个JSX元素是否匹配提取的内容
          const mixedContent = this.reconstructJsxMixedContent(parent, sourceFile);
          if (mixedContent === originalText) {
            return parent;
          }
        }
        parent = parent.parent;
      }

      // 检查是否是模板字符串节点
      if (ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        const nodeText = ASTUtils.nodeToText(node, sourceFile);
        if (this.shouldReplaceNode(nodeText, originalText, true)) {
          return node;
        }
      }

      // 向上查找父节点，可能在模板字符串内部
      let parent2 = node.parent;
      while (parent2) {
        if (ts.isTemplateExpression(parent2) || ts.isNoSubstitutionTemplateLiteral(parent2)) {
          const nodeText = ASTUtils.nodeToText(parent2, sourceFile);
          if (this.shouldReplaceNode(nodeText, originalText, true)) {
            return parent2;
          }
        }
        parent2 = parent2.parent;
      }
    }

    // 检查普通字符串节点
    if (ts.isStringLiteral(node)) {
      const nodeText = ASTUtils.nodeToText(node, sourceFile);
      if (this.shouldReplaceNode(nodeText, originalText, false)) {
        return node;
      }

      // 如果直接匹配失败，尝试查找父节点
      let parent = node.parent;
      while (parent) {
        if (ts.isStringLiteral(parent)) {
          const parentText = ASTUtils.nodeToText(parent, sourceFile);
          if (this.shouldReplaceNode(parentText, originalText, false)) {
            return parent;
          }
        }
        parent = parent.parent;
      }
    }

    // 检查JSX文本节点
    if (ts.isJsxText(node)) {
      const nodeText = ASTUtils.nodeToText(node, sourceFile);
      if (this.shouldReplaceNode(nodeText, originalText, false)) {
        return node;
      }
    }

    // 如果在当前位置没有找到匹配的节点，尝试在附近位置查找
    const nearbyNode = this.findNearbyStringNode(sourceFile, position, originalText);
    if (nearbyNode) {
      return nearbyNode;
    }

    return undefined;
  }

  /**
   * 重构JSX元素的混合内容，用于验证匹配
   * @param jsxElement - JSX元素节点
   * @param sourceFile - 源文件
   * @returns 重构的模板字符串格式内容
   */
  private static reconstructJsxMixedContent(jsxElement: ts.JsxElement, sourceFile: ts.SourceFile): string {
    const children = jsxElement.children;
    if (!children || children.length === 0) {
      return '';
    }

    let templateText = '`';
    for (const child of children) {
      if (ts.isJsxText(child)) {
        const text = child.text.trim();
        if (text) {
          templateText += text;
        }
      } else if (ts.isJsxExpression(child) && child.expression) {
        const expressionText = ASTUtils.nodeToText(child.expression, sourceFile);
        templateText += `\${${expressionText}}`;
      }
    }
    templateText += '`';

    return templateText;
  }

  /**
   * 在指定位置附近（前后5个字符）模糊查找匹配的字符串节点
   * @param sourceFile - 源文件AST
   * @param position - 目标位置
   * @param originalText - 字符串的原始文本
   * @returns 找到的AST节点，如果找不到则返回undefined
   */
  private static findNearbyStringNode(
    sourceFile: ts.SourceFile,
    position: number,
    originalText: string,
  ): ts.Node | undefined {
    // 在前后5个字符的范围内查找
    for (let offset = -5; offset <= 5; offset++) {
      const nearbyPosition = position + offset;
      if (nearbyPosition < 0 || nearbyPosition >= sourceFile.text.length) {
        continue;
      }

      const node = ASTUtils.findNodeAtPosition(sourceFile, nearbyPosition);
      if (!node) continue;

      if (ts.isStringLiteral(node) || ts.isJsxText(node)) {
        const nodeText = ASTUtils.nodeToText(node, sourceFile);
        if (this.shouldReplaceNode(nodeText, originalText, false)) {
          return node;
        }
      }
    }

    return undefined;
  }

  /**
   * 决定是否应该替换一个给定的AST节点
   * 通过规范化文本（移除引号、统一换行符）来处理普通字符串和模板字符串的比较
   * @param nodeText - 从AST节点获取的文本
   * @param originalText - 从提取信息中得到的原始文本
   * @param isTemplateString - 是否为模板字符串
   * @returns 如果应该替换，则返回true
   */
  static shouldReplaceNode(nodeText: string, originalText: string, isTemplateString: boolean): boolean {
    // 标准化换行符和移除引号
    const normalizeText = (text: string) => {
      // 移除首尾引号
      text = text.replace(/^['"`]|['"`]$/g, '');
      // 将实际换行符转换为\n
      text = text.replace(/\r?\n/g, '\n');
      // 将转义的\\n转换为\n
      text = text.replace(/\\n/g, '\n');
      return text;
    };

    // 对于模板字符串
    if (isTemplateString) {
      return normalizeText(nodeText) === normalizeText(originalText);
    }

    // 对于普通字符串
    const normalizedNodeText = normalizeText(nodeText);
    const normalizedOriginalText = normalizeText(originalText);

    // 直接比较标准化后的文本
    if (normalizedNodeText === normalizedOriginalText) {
      return true;
    }

    // 尝试解析JSON字符串（处理其他转义字符）
    try {
      const parsedNodeText = JSON.parse(`"${normalizedNodeText}"`);
      const parsedOriginalText = JSON.parse(`"${normalizedOriginalText}"`);
      return parsedNodeText === parsedOriginalText;
    } catch {
      return false;
    }
  }
}
