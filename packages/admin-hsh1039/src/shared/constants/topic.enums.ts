// 话题相关枚举

// 话题状态
// 注意：启用=0，禁用=1，这是全站 status 字段的统一标准
export enum TopicStatus {
  ENABLED = 0, // 启用
  DISABLED = 1, // 禁用
}

// 话题类型（预留，根据业务需求扩展）
// export enum TopicType {
//   DEFAULT = 1, // 默认话题
//   SYSTEM = 2, // 系统话题
//   USER_CREATED = 3, // 用户创建
// }