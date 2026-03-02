/**
 * MedLens — Static UI Translations
 * ==================================
 * All user-facing strings organized by page/section.
 * English is the source of truth. Other languages generated via Gemini.
 * Add new languages by adding entries to this map.
 */

export interface UITranslations {
  // Landing page
  landing: {
    heroTitle: string;
    heroSubtitle: string;
    ctaButton: string;
    ctaSubtext: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    trustEncrypted: string;
    trustEncryptedDetail: string;
    trustLanguages: string;
    trustLanguagesDetail: string;
    trustNoAds: string;
    trustNoAdsDetail: string;
    trustChat: string;
    trustChatDetail: string;
    disclaimer: string;
    copyright: string;
    emergencyCall: string;
    pickLanguage: string;
  };
  // Scan page
  scan: {
    title: string;
    subtitle: string;
    openCamera: string;
    uploadPhoto: string;
    securityNote: string;
    analyzing: string;
    analyzeButton: string;
    retake: string;
    backButton: string;
    errorTitle: string;
    tryAgain: string;
  };
  // Confirm page
  confirm: {
    title: string;
    subtitle: string;
    confirmButton: string;
    rescan: string;
    missingData: string;
    disclaimer: string;
    diagnosisLabel: string;
    medicationsLabel: string;
    followUpsLabel: string;
    warningsLabel: string;
    highConfidence: string;
    medConfidence: string;
    lowConfidence: string;
  };
  // Plan page
  plan: {
    carePlan: string;
    summaryTab: string;
    medsTab: string;
    followUpsTab: string;
    warningsTab: string;
    setup: string;
    calendarExport: string;
    downloadAgain: string;
    calendarDone: string;
    scanNew: string;
    home: string;
    deleteData: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    deleteConfirmButton: string;
    cancelButton: string;
    loading: string;
    // Medication tracking
    taken: string;
    take: string;
    medsProgress: string;
    // Q&A
    askQuestion: string;
    askPlaceholder: string;
    suggestedQuestions: string[];
    // Empty states
    noMeds: string;
    noFollowUps: string;
    noWarnings: string;
    // Share
    shareTitle: string;
    shareLink: string;
    copied: string;
    // Summary
    summaryTitle: string;
    dischargedOn: string;
    doctorLabel: string;
    hospitalLabel: string;
  };
  // Welcome back
  welcomeBack: {
    greeting: string;
    savedMessage: string;
    viewPlan: string;
    scanNew: string;
  };
  // Common
  common: {
    emergency: string;
    call911: string;
    close: string;
    back: string;
    next: string;
    error: string;
    retry: string;
  };
}

const en: UITranslations = {
  landing: {
    heroTitle: "MedLens",
    heroSubtitle: "Turn your discharge papers into a personal recovery assistant — in your language, free, private, and always available.",
    ctaButton: "📸 Scan Your Discharge Papers",
    ctaSubtext: "No account needed · Free forever · Encrypted on your device",
    step1Title: "Take a Photo",
    step1Desc: "Snap a picture of your discharge summary. That's it — no typing required.",
    step2Title: "AI Reads & Translates",
    step2Desc: "We extract your medications, follow-ups, and warning signs — in any of 20 languages.",
    step3Title: "Your Recovery Plan",
    step3Desc: "Get reminders, tap-to-explain, ask questions, and share with your caregiver.",
    trustEncrypted: "Encrypted on your device",
    trustEncryptedDetail: "Deleted from our servers instantly",
    trustLanguages: "20 languages",
    trustLanguagesDetail: "AI translates your care plan",
    trustNoAds: "No ads. No data selling.",
    trustNoAdsDetail: "Your health data stays yours",
    trustChat: "Ask follow-up questions",
    trustChatDetail: "AI answers from your discharge",
    disclaimer: "MedLens does not provide medical advice. Always consult your healthcare provider.",
    copyright: "MedLens. All rights reserved.",
    emergencyCall: "Emergency? Call 911",
    pickLanguage: "Choose your language",
  },
  scan: {
    title: "Take a photo of your discharge summary",
    subtitle: "Make sure all the text is readable. You can take multiple photos if needed.",
    openCamera: "Open Camera",
    uploadPhoto: "Upload a Photo",
    securityNote: "Your photo is processed securely and never stored on our servers.",
    analyzing: "Reading your discharge papers...",
    analyzeButton: "✨ Analyse My Discharge",
    retake: "Retake / Upload Different",
    backButton: "← Back",
    errorTitle: "Something went wrong",
    tryAgain: "Try Again",
  },
  confirm: {
    title: "Review Your Care Plan",
    subtitle: "We extracted this from your discharge papers. Please review before confirming.",
    confirmButton: "✅ Confirm & Create My Plan",
    rescan: "← Rescan",
    missingData: "Some information couldn't be extracted. You can still proceed — just be aware of any gaps.",
    disclaimer: "This is an AI-generated summary. Always verify with your healthcare provider.",
    diagnosisLabel: "Diagnosis",
    medicationsLabel: "Medications",
    followUpsLabel: "Follow-Up Appointments",
    warningsLabel: "Warning Signs",
    highConfidence: "High confidence",
    medConfidence: "Medium confidence",
    lowConfidence: "Low confidence — verify with your doctor",
  },
  plan: {
    carePlan: "Care Plan",
    summaryTab: "Summary",
    medsTab: "Meds",
    followUpsTab: "Follow-Ups",
    warningsTab: "Warnings",
    setup: "Setup",
    calendarExport: "📅 Add Reminders to Calendar",
    downloadAgain: "Download again",
    calendarDone: "✅ Calendar downloaded!",
    scanNew: "📸 New",
    home: "Home",
    deleteData: "Delete All Data",
    deleteConfirmTitle: "Delete Everything?",
    deleteConfirmMessage: "This will permanently delete your care plan and all data from this device. This cannot be undone.",
    deleteConfirmButton: "Yes, Delete Everything",
    cancelButton: "Cancel",
    loading: "Loading your care plan...",
    taken: "Taken",
    take: "Take",
    medsProgress: "taken",
    askQuestion: "Ask",
    askPlaceholder: "Ask about your care plan...",
    suggestedQuestions: [
      "What foods should I avoid?",
      "When can I exercise again?",
      "What are the side effects of my medications?",
      "When should I call my doctor?",
    ],
    noMeds: "No medications found in your discharge summary.",
    noFollowUps: "No follow-up appointments found.",
    noWarnings: "No warning signs found — always call your doctor if something feels wrong.",
    shareTitle: "Share Care Plan",
    shareLink: "Share via link",
    copied: "Link copied!",
    summaryTitle: "Discharge Summary",
    dischargedOn: "Discharged on",
    doctorLabel: "Doctor",
    hospitalLabel: "Hospital",
  },
  welcomeBack: {
    greeting: "Welcome back",
    savedMessage: "Your care plan is saved on this device.",
    viewPlan: "📋 View My Care Plan",
    scanNew: "📸 Scan New",
  },
  common: {
    emergency: "🚨 Emergency? Call 911 now",
    call911: "Call 911",
    close: "Close",
    back: "Back",
    next: "Next",
    error: "Something went wrong",
    retry: "Try Again",
  },
};

const es: UITranslations = {
  landing: {
    heroTitle: "MedLens",
    heroSubtitle: "Convierte tus papeles de alta en un asistente personal de recuperación — en tu idioma, gratis, privado y siempre disponible.",
    ctaButton: "📸 Escanea tus papeles de alta",
    ctaSubtext: "Sin cuenta · Gratis · Encriptado en tu dispositivo",
    step1Title: "Toma una foto",
    step1Desc: "Toma una foto de tu resumen de alta. Eso es todo, no necesitas escribir.",
    step2Title: "La IA lee y traduce",
    step2Desc: "Extraemos tus medicamentos, citas y señales de alerta — en tu idioma.",
    step3Title: "Tu plan de recuperación",
    step3Desc: "Recibe recordatorios, toca para explicar, haz preguntas y comparte con tu cuidador.",
    trustEncrypted: "Encriptado en tu dispositivo",
    trustEncryptedDetail: "Eliminado de nuestros servidores al instante",
    trustLanguages: "20 idiomas",
    trustLanguagesDetail: "La IA traduce tu plan de cuidado",
    trustNoAds: "Sin anuncios. Sin venta de datos.",
    trustNoAdsDetail: "Tus datos de salud son tuyos",
    trustChat: "Haz preguntas de seguimiento",
    trustChatDetail: "La IA responde desde tu alta",
    disclaimer: "MedLens no proporciona consejo médico. Siempre consulta a tu médico.",
    copyright: "MedLens. Todos los derechos reservados.",
    emergencyCall: "¿Emergencia? Llama al 911",
    pickLanguage: "Elige tu idioma",
  },
  scan: {
    title: "Toma una foto de tu resumen de alta",
    subtitle: "Asegúrate de que todo el texto sea legible.",
    openCamera: "Abrir cámara",
    uploadPhoto: "Subir una foto",
    securityNote: "Tu foto se procesa de forma segura y nunca se almacena.",
    analyzing: "Leyendo tus papeles de alta...",
    analyzeButton: "✨ Analizar mi alta",
    retake: "Tomar otra / Subir diferente",
    backButton: "← Atrás",
    errorTitle: "Algo salió mal",
    tryAgain: "Intentar de nuevo",
  },
  confirm: {
    title: "Revisa tu plan de cuidado",
    subtitle: "Extrajimos esto de tus papeles de alta. Revisa antes de confirmar.",
    confirmButton: "✅ Confirmar y crear mi plan",
    rescan: "← Reescanear",
    missingData: "Alguna información no pudo ser extraída.",
    disclaimer: "Este es un resumen generado por IA. Siempre verifica con tu médico.",
    diagnosisLabel: "Diagnóstico",
    medicationsLabel: "Medicamentos",
    followUpsLabel: "Citas de seguimiento",
    warningsLabel: "Señales de alerta",
    highConfidence: "Alta confianza",
    medConfidence: "Confianza media",
    lowConfidence: "Baja confianza — verifica con tu médico",
  },
  plan: {
    carePlan: "Plan de cuidado",
    summaryTab: "Resumen",
    medsTab: "Medicinas",
    followUpsTab: "Citas",
    warningsTab: "Alertas",
    setup: "Configuración",
    calendarExport: "📅 Agregar recordatorios al calendario",
    downloadAgain: "Descargar de nuevo",
    calendarDone: "✅ ¡Calendario descargado!",
    scanNew: "📸 Nuevo",
    home: "Inicio",
    deleteData: "Eliminar todos los datos",
    deleteConfirmTitle: "¿Eliminar todo?",
    deleteConfirmMessage: "Esto eliminará permanentemente tu plan de cuidado. No se puede deshacer.",
    deleteConfirmButton: "Sí, eliminar todo",
    cancelButton: "Cancelar",
    loading: "Cargando tu plan de cuidado...",
    taken: "Tomado",
    take: "Tomar",
    medsProgress: "tomados",
    askQuestion: "Preguntar",
    askPlaceholder: "Pregunta sobre tu plan de cuidado...",
    suggestedQuestions: [
      "¿Qué alimentos debo evitar?",
      "¿Cuándo puedo hacer ejercicio?",
      "¿Cuáles son los efectos secundarios de mis medicamentos?",
      "¿Cuándo debo llamar a mi médico?",
    ],
    noMeds: "No se encontraron medicamentos en tu resumen de alta.",
    noFollowUps: "No se encontraron citas de seguimiento.",
    noWarnings: "No se encontraron señales de alerta.",
    shareTitle: "Compartir plan",
    shareLink: "Compartir por enlace",
    copied: "¡Enlace copiado!",
    summaryTitle: "Resumen de alta",
    dischargedOn: "Dado de alta el",
    doctorLabel: "Doctor",
    hospitalLabel: "Hospital",
  },
  welcomeBack: {
    greeting: "Bienvenido de nuevo",
    savedMessage: "Tu plan de cuidado está guardado en este dispositivo.",
    viewPlan: "📋 Ver mi plan",
    scanNew: "📸 Escanear nuevo",
  },
  common: {
    emergency: "🚨 ¿Emergencia? Llama al 911",
    call911: "Llamar 911",
    close: "Cerrar",
    back: "Atrás",
    next: "Siguiente",
    error: "Algo salió mal",
    retry: "Intentar de nuevo",
  },
};

// Chinese Simplified
const zh: UITranslations = {
  landing: {
    heroTitle: "MedLens",
    heroSubtitle: "将您的出院文件转换为个人康复助手 — 使用您的语言，免费、私密、随时可用。",
    ctaButton: "📸 扫描您的出院文件",
    ctaSubtext: "无需账户 · 永久免费 · 在您的设备上加密",
    step1Title: "拍一张照片",
    step1Desc: "拍一张出院摘要的照片。就这么简单，无需打字。",
    step2Title: "AI 阅读和翻译",
    step2Desc: "我们提取您的药物、随访和警告标志 — 以20种语言。",
    step3Title: "您的康复计划",
    step3Desc: "获取提醒、点击解释、提问并与您的照护者分享。",
    trustEncrypted: "在您的设备上加密",
    trustEncryptedDetail: "立即从我们的服务器删除",
    trustLanguages: "20种语言",
    trustLanguagesDetail: "AI翻译您的护理计划",
    trustNoAds: "没有广告。不出售数据。",
    trustNoAdsDetail: "您的健康数据归您所有",
    trustChat: "提出后续问题",
    trustChatDetail: "AI根据您的出院文件回答",
    disclaimer: "MedLens不提供医疗建议。请始终咨询您的医疗保健提供者。",
    copyright: "MedLens。保留所有权利。",
    emergencyCall: "紧急情况？拨打911",
    pickLanguage: "选择您的语言",
  },
  scan: {
    title: "拍一张出院摘要的照片",
    subtitle: "确保所有文字清晰可读。",
    openCamera: "打开相机",
    uploadPhoto: "上传照片",
    securityNote: "您的照片安全处理，绝不存储。",
    analyzing: "正在阅读您的出院文件...",
    analyzeButton: "✨ 分析我的出院文件",
    retake: "重新拍照 / 上传其他",
    backButton: "← 返回",
    errorTitle: "出了点问题",
    tryAgain: "重试",
  },
  confirm: {
    title: "审查您的护理计划",
    subtitle: "我们从您的出院文件中提取了这些信息。请在确认前审查。",
    confirmButton: "✅ 确认并创建我的计划",
    rescan: "← 重新扫描",
    missingData: "某些信息无法提取。",
    disclaimer: "这是AI生成的摘要。请始终与您的医生核实。",
    diagnosisLabel: "诊断",
    medicationsLabel: "药物",
    followUpsLabel: "随访预约",
    warningsLabel: "警告标志",
    highConfidence: "高可信度",
    medConfidence: "中等可信度",
    lowConfidence: "低可信度 — 请与医生核实",
  },
  plan: {
    carePlan: "护理计划",
    summaryTab: "摘要",
    medsTab: "药物",
    followUpsTab: "随访",
    warningsTab: "警告",
    setup: "设置",
    calendarExport: "📅 添加提醒到日历",
    downloadAgain: "再次下载",
    calendarDone: "✅ 日历已下载！",
    scanNew: "📸 新扫描",
    home: "首页",
    deleteData: "删除所有数据",
    deleteConfirmTitle: "删除所有内容？",
    deleteConfirmMessage: "这将永久删除您的护理计划和所有数据。此操作无法撤消。",
    deleteConfirmButton: "是的，删除所有",
    cancelButton: "取消",
    loading: "正在加载您的护理计划...",
    taken: "已服用",
    take: "服用",
    medsProgress: "已服用",
    askQuestion: "提问",
    askPlaceholder: "询问关于您的护理计划...",
    suggestedQuestions: [
      "我应该避免哪些食物？",
      "我什么时候可以再次锻炼？",
      "我的药物有什么副作用？",
      "我什么时候应该打电话给医生？",
    ],
    noMeds: "出院摘要中未找到药物。",
    noFollowUps: "未找到随访预约。",
    noWarnings: "未找到警告标志。",
    shareTitle: "分享护理计划",
    shareLink: "通过链接分享",
    copied: "链接已复制！",
    summaryTitle: "出院摘要",
    dischargedOn: "出院日期",
    doctorLabel: "医生",
    hospitalLabel: "医院",
  },
  welcomeBack: {
    greeting: "欢迎回来",
    savedMessage: "您的护理计划已保存在此设备上。",
    viewPlan: "📋 查看我的护理计划",
    scanNew: "📸 新扫描",
  },
  common: {
    emergency: "🚨 紧急情况？立即拨打911",
    call911: "拨打911",
    close: "关闭",
    back: "返回",
    next: "下一步",
    error: "出了点问题",
    retry: "重试",
  },
};

// For languages without full translations, fall back to English
// The AI will still translate the medical content via Gemini
const translationMap: Record<string, UITranslations> = {
  en,
  es,
  zh,
};

export function getTranslations(languageCode: string): UITranslations {
  return translationMap[languageCode] ?? en;
}

export { en as defaultTranslations };
