import { flushPromises, mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { uploadContentFile } from '@/api';
import AudioUploader from '@/views/content/question-edit/components/AudioUploader.vue';

vi.mock('@/api', () => ({
  uploadContentFile: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(uploadContentFile).mockResolvedValue({ id: 'a1', path: 'https://cdn/a.mp3' });
});

describe('听力音频上传', () => {
  it('以 audio 用途上传并回填文件 ID', async () => {
    const wrapper = mount(AudioUploader, { props: { modelValue: null, audioUrls: {} } });
    const file = new File(['x'], 'a.mp3', { type: 'audio/mpeg' });
    const input = wrapper.find('input[type="file"]');
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true });

    await input.trigger('change');
    await flushPromises();

    expect(uploadContentFile).toHaveBeenCalledWith(file, 'audio');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['a1']);
  });
});
