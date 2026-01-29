const required = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

export const env = {
  dashscopeApiKey: required("DASHSCOPE_API_KEY"),
  dashscopeBaseUrl: process.env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1",
  qwenVisionModel: process.env.QWEN_VL_MODEL ?? "qwen3-vl-plus",
  qwenTextModel: process.env.QWEN_TEXT_MODEL ?? "qwen-turbo",
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "ea_session",
  sessionDays: Number(process.env.SESSION_DAYS ?? "30"),
};
