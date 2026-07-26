// 管理员相关枚举

// 管理员角色 (根据后端接口文档)
export enum AdminRole {
  SUPER_ADMIN = 1, // 超级管理员
  NORMAL_ADMIN = 2, // 普通管理员
}

// 管理员权限规则 (根据后端接口文档)
export enum AdminRule {
  VIEW_ONLY = 3, // 仅可查看
  AUDITOR = 35, // 审核员
  EDITOR = 47, // 编辑
  FULL_PERMISSION = 63, // 完全权限
}

// 管理员角色 (与 YAML AdminUserRole 对齐)
// super = 1: 超级管理员, general = 2: 普通管理员
export enum AdminUserRole {
  SUPER = 1,    // 超级管理员
  GENERAL = 2,  // 普通管理员
}

// 管理员状态
export enum AdminStatus {
  ACTIVE = 1, // 活跃
  INACTIVE = 2, // 停用
  DELETED = 3, // 已删除
}

// 操作日志类型
export enum OperationLogType {
  LOGIN = 1, // 登录
  LOGOUT = 2, // 退出
  CREATE = 3, // 创建
  UPDATE = 4, // 更新
  DELETE = 5, // 删除
  AUDIT = 6, // 审核
}

// 角色显示映射
export const AdminRoleMap: Record<AdminRole, { text: string; color: string }> = {
  [AdminRole.SUPER_ADMIN]: { text: '超级管理员', color: 'red' },
  [AdminRole.NORMAL_ADMIN]: { text: '普通管理员', color: 'blue' },
};

// 权限规则显示映射
export const AdminRuleMap: Record<AdminRule, string> = {
  [AdminRule.VIEW_ONLY]: '仅可查看',
  [AdminRule.AUDITOR]: '审核员',
  [AdminRule.EDITOR]: '编辑',
  [AdminRule.FULL_PERMISSION]: '完全权限',
};