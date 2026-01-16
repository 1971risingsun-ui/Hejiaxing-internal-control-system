import { SystemRules } from '../types';

export const DEFAULT_SYSTEM_RULES: SystemRules = {
  productionKeywords: ['大門', '防溢座', '加強'],
  subcontractorKeywords: ['怪手', '吊卡', '告示牌', '安衛貼紙', '警示燈', '帆布'],
  modularProductionKeywords: ['屋頂', '門片', '走道'],
  modularSubcontractorKeywords: ['吊裝', '土尾', '粉光'],
  materialFormulas: [],
  standardConstructionItems: [
    { name: '立柱', unit: '支' },
    { name: '澆置', unit: '洞' },
    { name: '(雙模)前模', unit: '米' },
    { name: '(雙模)後模', unit: '米' },
    { name: '(雙模)螺桿', unit: '米' },
    { name: '(雙模)澆置', unit: '米' },
    { name: '(雙模)拆模', unit: '米' },
    { name: '(雙模)清潔', unit: '' },
    { name: '(雙模)收模', unit: '米' },
    { name: '三橫骨架', unit: '米' },
    { name: '封板', unit: '米' },
    { name: '(單模)組模', unit: '米' },
    { name: '(單模)澆置', unit: '米' },
    { name: '(單模)拆模', unit: '米' },
    { name: '(單模)清潔', unit: '' },
    { name: '(單模)收模', unit: '米' },
    { name: '安走骨架', unit: '米' },
    { name: '安走三橫', unit: '米' },
    { name: '安走封板', unit: '米' },
    { name: '隔音帆布骨架', unit: '米' },
    { name: '隔音帆布', unit: '米' },
    { name: '大門門片安裝', unit: '樘' },
  ],
  maintenanceConstructionItems: [
    { name: '一般大門 (Cổng thông thường)', unit: '組/bộ' },
    { name: '日式拉門 (Cửa kéo kiểu Nhật)', unit: '組/bộ' },
    { name: '摺疊門 (Cửa xếp)', unit: '組/bộ' },
    { name: '(4", 5") 門柱 (Trụ cổng)', unit: '支/cây' },
    { name: '大門斜撐 (Thanh chống chéo cổng)', unit: '支/cây' },
    { name: '上拉桿 (Thanh kéo lên)', unit: '組/bộ' },
    { name: '後紐 (Nút sau)', unit: '片/tấm' },
    { name: '門栓、地栓 (Chốt cửa/Chốt sàn)', unit: '支/cây' },
    { name: '門片 (Cánh cửa)', unit: '片/tấm' },
    { name: '上軌道整修 (Sửa chữa ray trên)', unit: '支/thanh' },
    { name: '門片整修 (Sửa chữa cánh cửa)', unit: '組/bộ' },
    { name: '基礎座 (Chân đế)', unit: '個/cái' },
    { name: '下軌道 (Ray dưới)', unit: '米/mét' },
    { name: 'H型鋼立柱 (Cột thép hình H)', unit: '支/cây' },
    { name: '橫衍 (Thanh ngang)', unit: '米/mét' },
    { name: '簡易小門加工 (Gia công cửa nhỏ đơn)', unit: '樘/cửa' },
    { name: '簡易小門維修 (Sửa cửa nhỏ đơn giản)', unit: '式/kiểu' },
    { name: '小門後紐 (Nút sau cửa nhỏ)', unit: '個/cái' },
    { name: '甲種圍籬 (Hàng rào loại A)', unit: '米/mét' },
    { name: '乙種圍籬 (Hàng rào loại B)', unit: '米/mét' },
    { name: '防颱型圍籬 (Hàng rào công trình chống bão)', unit: '米/mét' },
    { name: '一般圍籬立柱 (Trụ hàng rào)', unit: '支/cây' },
    { name: '斜撐 (Chống chéo)', unit: '支/cây' },
    { name: '防颱型立柱 (Cột chống bão)', unit: '支/cây' },
    { name: '6米角鋼 (Thép góc)', unit: '支/cây' },
    { name: '長斜撐 (Dầm chéo dài)', unit: '支/cây' },
    { name: '一般鋼板 (Tấm thép thường)', unit: '片/tấm' },
    { name: '烤漆鋼板 (Thép tấm sơn tĩnh điện)', unit: '片/tấm' },
    { name: '鍍鋅鋼板 (Thép mạ kẽm)', unit: '片/tấm' },
    { name: '懸吊式骨架 (Khung treo)', unit: '支/cây' },
    { name: '懸吊式懸臂/短臂 (Cần treo kiểu treo)', unit: '支/cây' },
    { name: 'L收邊板 (Tấm vi園 chữ L)', unit: '片/tấm' },
    { name: '懸吊式安走鋼板 (Tấm thép lối đi an全)', unit: '片/tấm' },
  ],
  completionCategories: [
    {
        id: 'FENCE',
        label: '圍籬 (Hàng rào)',
        defaultUnit: '米',
        items: [
            "一般型安裝 (Hàng rào loại tiêu chuẩn)",
            "防颱型安裝 (Hàng rào loại chống bão)",
            "懸吊式安全走廊安裝 (Lắp đặt hành lang an toàn treo)"
        ]
    },
    {
        id: 'BARRIER',
        label: '防溢座 (Bệ chống tràn)',
        defaultUnit: '米',
        items: [
            "30cm單模 (Khuôn đơ)", "30cm雙模 (Khuôn đôi)", "30cm假模 (Khuôn giả)",
            "60cm單模 (Khuôn đơn)", "60cm雙模 (Khuôn đôi)", "60cm假模 (Khuôn giả)"
        ]
    },
    {
        id: 'DOOR',
        label: '門 (Cửa)',
        defaultUnit: '組',
        items: [
            "一般大門 (Cửa chính loại tiêu chuẩn)",
            "日式拉門 (Cửa trượt kiểu Nhật)",
            "客製化小門 (Cửa nhỏ tùy chỉnh)",
            "簡易小門加工 (Gia công cửa nhỏ đơn giản)"
        ]
    },
    {
        id: 'OTHER',
        label: '其他 (Khác)',
        defaultUnit: '',
        items: [
            "警示燈 (Đèn cảnh báo)",
            "巨型告示牌 (Biển báo khổng lồ)",
            "告示牌 (Biển báo)",
            "五合一偵測器 (Bộ cảm biến 5 trong 1)"
        ]
    }
  ]
};