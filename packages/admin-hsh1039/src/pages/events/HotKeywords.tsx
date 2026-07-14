import { TagListEditor, TagItem } from '@/components/templates/TagListEditor';

const HotKeywords = () => {
  return (
    <TagListEditor
      title="热门搜索词管理"
      description="管理平台热门搜索关键词。"
      configName="hotkeywords"
      placeholder="输入关键词"
      maxLength={50}
      getDisplayText={(item) => item.keyword}
      inputToItem={(keyword) => ({ keyword })}
    />
  );
};

export default HotKeywords;
