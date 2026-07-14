import { TagListEditor } from '@/components/templates/TagListEditor';

const UserTags = () => {
  return (
    <TagListEditor
      title="用户标签管理"
      description="管理平台用户标签，用户可在个人资料中选择感兴趣的标签。"
      configName="usertags"
      placeholder="输入标签名称"
      maxLength={20}
      getDisplayText={(item) => item.name}
      inputToItem={(name) => ({ name })}
    />
  );
};

export default UserTags;
