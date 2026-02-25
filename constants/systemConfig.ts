
import { SystemRules, UserRole } from '../types';

export const ROC_HOLIDAYS = ['01-01', '02-28', '04-04', '04-05', '05-01', '10-10'];

export const PERMISSION_STRUCTURE = [
  { id: 'engineering', label: '工務總覽', type: 'main' },
  { id: 'task_planning', label: '任務規劃', type: 'main' },
  { id: 'engineering_hub', label: '工作排程', type: 'main', children: [
    { id: 'daily_dispatch', label: '明日工作排程' },
    { id: 'driving_time', label: '估計行車時間' },
    { id: 'weekly_schedule', label: '週間工作排程' },
    { id: 'report_tracking', label: '回報追蹤表' },
    { id: 'outsourcing', label: '外包廠商管理' },
    { id: 'engineering_groups', label: '工程小組設定' },
  ]},
  { id: 'purchasing_hub', label: '採購管理', type: 'main', children: [
    { id: 'purchasing_items', label: '採購項目' },
    { id: 'stock_alert', label: '常備庫存爆量通知' },
    { id: 'purchasing_suppliers', label: '供應商清冊' },
    { id: 'purchasing_subcontractors', label: '外包廠商' },
    { id: 'purchasing_orders', label: '採購單管理' },
    { id: 'purchasing_inbounds', label: '進料明細' },
  ]},
  { id: 'hr', label: '人事管理', type: 'main' },
  { id: 'production', label: '生產／備料', type: 'main' },
  { id: 'equipment', label: '設備與工具', type: 'main', children: [
    { id: 'equipment_tools', label: '工具管理' },
    { id: 'equipment_assets', label: '大型設備管理' },
    { id: 'equipment_vehicles', label: '車輛管理' },
  ]},
  { id: 'report', label: '工作回報', type: 'main' },
  { id: 'users', label: '系統權限設定', type: 'main' },
];

export const DEFAULT_SYSTEM_RULES: SystemRules = {
  productionKeywords: ['防溢座', '施工大門', '小門', '巨'],
  subcontractorKeywords: ['怪手', '告示牌', '安衛貼紙', '美化帆布', '噪音管制看板', '監測告示牌', '寫字'],
  modularProductionKeywords: [],
  modularSubcontractorKeywords: [],
  cardGenerationRules: [
    {
      id: 'rule-quote-001',
      keyword: '甲種圍籬',
      targetType: 'material', // 卡片類型: material(工項/備料), production(廠內), outsourcing(外包), subcontractor(協力)
      materialTemplates: [    // 自動生成的明細
        {
          id: 'tpl-q1',
          name: '立柱',
          spec: '',
          quantityFormula: 'Math.ceil(baseQty / 2.4 + 1)',
          unit: '支'
        },
        {
          id: 'tpl-q2',
          name: '二橫',
          spec: '',
          quantityFormula: 'Math.ceil((baseQty / 2.4 + 1) * 2)',
          unit: '支'
        },
        {
          id: 'tpl-q3',
          name: '三橫',
          spec: '',
          quantityFormula: 'Math.ceil((baseQty / 2.4 + 1) * 3)',
          unit: '支'
        },
        {
          id: 'tpl-q4',
          name: '斜撐',
          spec: '',
          quantityFormula: 'Math.ceil(baseQty / 2.4 + 1)',
          unit: '支'
        },
        {
          id: 'tpl-q5',
          name: '圍籬板',
          spec: '',
          quantityFormula: 'Math.ceil(baseQty / 0.75)',
          unit: '片'
        },
        {
          id: 'tpl-q6',
          name: '2.4m圍籬板',
          spec: '',
          quantityFormula: 'Math.ceil(baseQty / 0.95)',
          unit: '片'
        }
      ]
    },
    {
      id: 'rule-quote-002',
      keyword: '防溢座',
      targetType: 'material', // 卡片類型: material(工項/備料), production(廠內), outsourcing(外包), subcontractor(協力)
      materialTemplates: [    // 自動生成的明細
        {
          id: 'tpl-q1',
          name: '單模',
          spec: '',
          quantityFormula: 'Math.ceil(baseQty / 1.5)',
          unit: '片'
        },
        {
          id: 'tpl-q2',
          name: '雙模',
          spec: '',
          quantityFormula: 'Math.ceil((baseQty / 1.5) * 2)',
          unit: '片'
        },
        {
          id: 'tpl-q3',
          name: '假模',
          spec: '',
          quantityFormula: 'Math.ceil(baseQty / 2.4)',
          unit: '片'
        }
      ]
    },
     {
      id: 'rule-quote-003',
      keyword: '轉角',
      targetType: 'material', // 卡片類型: material(工項/備料), production(廠內), outsourcing(外包), subcontractor(協力)
      materialTemplates: [    // 自動生成的明細
        {
          id: 'tpl-q1',
          name: '透明板',
          spec: '',
          quantityFormula: 'Math.ceil(baseQty / 0.75)',
          unit: '片'
        }
      ]
    },
    {
      id: 'rule-quote-004',
      keyword: '安全走廊',
      targetType: 'material', // 卡片類型: material(工項/備料), production(廠內), outsourcing(外包), subcontractor(協力)
      materialTemplates: [    // 自動生成的明細
        {
          id: 'tpl-q1',
          name: '骨料',
          spec: '',
          quantityFormula: 'Math.ceil(baseQty / 2.4 + 1)',
          unit: '組'
        },
        {
          id: 'tpl-q2',
          name: '安走板',
          spec: '',
          quantityFormula: 'Math.ceil(baseQty / 0.75)',
          unit: '片'
        }
      ]
    }
  ],
  durationEstimationRules: [
    {
      id: 'rule-est-001',
      keyword: '甲種圍籬',
      targetType: 'material',
      materialTemplates: [
        {
          id: 'tpl-e1',
          name: '站立柱',
          spec: '',
          quantityFormula: 'baseQty / 96',
          unit: '天'
        },
        {
          id: 'tpl-e2',
          name: '骨架',
          spec: '',
          quantityFormula: 'baseQty / 140',
          unit: '天'
        },
        {
          id: 'tpl-e3',
          name: '封板',
          spec: '',
          quantityFormula: 'baseQty / 140',
          unit: '天'
        }
      ]
    },
    {
      id: 'rule-est-002',
      keyword: '怪手',
      targetType: 'subcontractor',
      materialTemplates: [
        {
          id: 'tpl-e1',
          name: '基地挖洞',
          spec: '',
          quantityFormula: 'baseQty / 100 + 1',
          unit: '天'
        },
        {
          id: 'tpl-e2',
          name: '基地整地',
          spec: '',
          quantityFormula: 'baseQty * baseQty / 1240',
          unit: '天'
        }
      ]
    },
    {
      id: 'rule-est-003',
      keyword: '防溢座',
      targetType: 'material',
      materialTemplates: [
        {
          id: 'tpl-e1',
          name: '30cm單模',
          spec: '',
          quantityFormula: 'baseQty / 100',
          unit: '天'
        },
        {
          id: 'tpl-e2',
          name: '30cm雙模',
          spec: '',
          quantityFormula: 'baseQty / 60',
          unit: '天'
        },
        {
          id: 'tpl-e3',
          name: '60cm雙模',
          spec: '',
          quantityFormula: 'baseQty / 40',
          unit: '天'
        }
      ]
    },
    {
      id: 'rule-est-004',
      keyword: '安全走廊',
      targetType: 'material',
      materialTemplates: [
        {
          id: 'tpl-e1',
          name: '安全走廊',
          spec: '',
          quantityFormula: 'baseQty / 30',
          unit: '天'
        }
      ]
    }
  ],
  rolePermissions: {
    [UserRole.ADMIN]: { 
      displayName: '管理員', 
      allowedViews: ['update_log', 'engineering', 'task_planning', 'engineering_hub', 'daily_dispatch', 'driving_time', 'weekly_schedule', 'report_tracking', 'outsourcing', 'engineering_groups', 'purchasing_hub', 'purchasing_items', 'stock_alert', 'purchasing_suppliers', 'purchasing_subcontractors', 'purchasing_orders', 'purchasing_inbounds', 'hr', 'production', 'equipment', 'report', 'users'] 
    },
    [UserRole.MANAGER]: { 
      displayName: '專案經理', 
      allowedViews: ['update_log', 'engineering', 'task_planning', 'engineering_hub', 'daily_dispatch', 'driving_time', 'weekly_schedule', 'report_tracking', 'outsourcing', 'purchasing_hub', 'purchasing_items', 'stock_alert', 'purchasing_suppliers', 'purchasing_subcontractors', 'purchasing_orders', 'purchasing_inbounds', 'hr', 'production', 'equipment', 'report'] 
    },
    [UserRole.ENGINEERING]: { 
      displayName: '工務人員', 
      allowedViews: ['update_log', 'engineering', 'task_planning', 'engineering_hub', 'daily_dispatch', 'driving_time', 'weekly_schedule', 'report', 'report_tracking'] 
    },
    [UserRole.FACTORY]: { 
      displayName: '廠務人員', 
      allowedViews: ['update_log', 'engineering', 'production', 'equipment', 'equipment_tools', 'report'] 
    },
    [UserRole.WORKER]: { 
      displayName: '現場人員', 
      allowedViews: ['update_log', 'engineering', 'engineering_hub', 'daily_dispatch', 'report'] 
    }
  },
  materialFormulas: [
    {
      id: 'f-1',
      keyword: '甲種圍籬',
      category: '圍籬',
      items: [
        { id: 'fi-1', name: '立柱', formula: 'Math.ceil(baseQty / 2.4 + 1)', unit: '支' },
        { id: 'fi-2', name: '二橫', formula: 'Math.ceil((baseQty / 2.4 + 1) * 2)', unit: '支' },
        { id: 'fi-3', name: '三橫', formula: 'Math.ceil((baseQty / 2.4 + 1) * 3)', unit: '支' },
        { id: 'fi-4', name: '斜撐', formula: 'Math.ceil(baseQty / 2.4 + 1)', unit: '支' },
        { id: 'fi-5', name: '圍籬板', formula: 'Math.ceil(baseQty / 0.75)', unit: '片' },
        { id: 'fi-6', name: '2.4m圍籬板', formula: 'Math.ceil(baseQty / 0.95)', unit: '片' },
      ]
    },
    { id: 'f-2', keyword: '防溢座', category: '防溢座', items: [
      { id: 'fi-7', name: '單模', formula: 'Math.ceil(baseQty / 1.5)', unit: '片' },
      { id: 'fi-8', name: '雙模', formula: 'Math.ceil((baseQty / 1.5) * 2)', unit: '片' },
      { id: 'fi-9', name: '假模', formula: 'Math.ceil(baseQty / 2.4)', unit: '片' },
    ]},
    { id: 'f-3', keyword: '轉角', category: '轉角', items: [
      { id: 'fi-10', name: '透明板', formula: 'Math.ceil(baseQty / 0.75)', unit: '片' },
    ]},
    { id: 'f-4', keyword: '安全走廊', category: '安全走廊', items: [
      { id: 'fi-11', name: '骨料', formula: 'Math.ceil(baseQty / 2.4 + 1)', unit: '組' },
      { id: 'fi-12', name: '安走板', formula: 'Math.ceil(baseQty / 0.75)', unit: '片' },
    ]}
  ],
  importConfig: {
    projectKeywords: { maintenance: '維修', modular: '組合屋' },
    recordKeywords: { recordTitle: '施工紀錄', reportTitle: '施工報告' },
    completionKeywords: { dismantle: '拆' },
    planningKeywords: {
      headerRow: 8,
      subCatFence: '安全圍籬及休息區',
      subCatModularStruct: '主結構租賃',
      subCatModularReno: '裝修工程',
      subCatModularOther: '其他工程',
      subCatModularDismantle: '拆除工程'
    }
  }
};
