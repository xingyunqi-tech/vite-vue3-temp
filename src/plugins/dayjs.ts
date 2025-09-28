import dayjs from 'dayjs';
import RelativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';

// 使用插件
dayjs.extend(RelativeTime);
dayjs.extend(utc);

export default dayjs;
