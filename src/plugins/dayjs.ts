import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isToday from 'dayjs/plugin/isToday';
import RelativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';

// 使用插件
dayjs.extend(RelativeTime);
dayjs.extend(utc);
dayjs.extend(isoWeek);
dayjs.extend(isToday);

// 默认中文（dayjs 内置默认是 en）；启用国际化时由 App.vue 按当前语言覆盖
dayjs.locale('zh-cn');

export default dayjs;
