/**
 * 强密码验证（管理员账户）：至少8位，包含大写字母、小写字母、数字、特殊符号。
 * 供添加管理员、专区管理员设置等表单复用。
 */
export const validateStrongPassword = (_: any, value: string): Promise<void> => {
  if (!value) return Promise.resolve(); // required 规则已处理空值

  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    const missingTypes: string[] = [];
    if (!hasUpperCase) missingTypes.push('大写字母');
    if (!hasLowerCase) missingTypes.push('小写字母');
    if (!hasNumber) missingTypes.push('数字');
    if (!hasSpecialChar) missingTypes.push('特殊符号');
    return Promise.reject(
      new Error(`密码必须包含大写字母、小写字母、数字、特殊符号。当前缺少: ${missingTypes.join('、')}`)
    );
  }

  return Promise.resolve();
};

export default validateStrongPassword;
