// 设计模板 — 目前专注浴室
// 每种风格配多张备选图，由 AI 动态选择最匹配的

const designs = [
  {
    id: 'bathroom-minimalist',
    name: '极简浴室',
    style: '极简',
    description: '纯白磁砖，隐藏式收纳，每件产品都有存在的理由。',
    imageUrl: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1400&q=80',
    rooms: ['浴室'],
    // 备选图（不同角度/组合）
    variants: [
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1400&q=80',  // 台盆+镜
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1400&q=80', // 整体空间
      'https://images.unsplash.com/photo-1564540574859-0dfb63985953?w=1400&q=80', // 淋浴间
      'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1400&q=80', // 浴缸
    ],
    hotspots: [
      { id: 'faucet',  label: '水龙头', x: 52, y: 58, category: 'faucet',  productId: 'faucet-001' },
      { id: 'basin',   label: '洗手盆', x: 52, y: 72, category: 'basin',   productId: 'basin-001' },
      { id: 'mirror',  label: '浴室镜', x: 52, y: 28, category: 'mirror',  productId: 'mirror-001' },
      { id: 'shower',  label: '花洒',   x: 82, y: 25, category: 'shower',  productId: 'shower-001' },
      { id: 'toilet',  label: '马桶',   x: 20, y: 65, category: 'toilet',  productId: 'toilet-001' },
    ],
  },
  {
    id: 'bathroom-nordic',
    name: '北欧浴室',
    style: '北欧',
    description: '木色元素，大量自然光，温暖与干净并存。',
    imageUrl: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1400&q=80',
    rooms: ['浴室'],
    variants: [
      'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1400&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1400&q=80',
    ],
    hotspots: [
      { id: 'faucet',  label: '水龙头',  x: 48, y: 55, category: 'faucet', productId: 'faucet-002' },
      { id: 'basin',   label: '洗手盆',  x: 48, y: 70, category: 'basin',  productId: 'basin-002' },
      { id: 'mirror',  label: '浴室镜',  x: 48, y: 25, category: 'mirror', productId: 'mirror-001' },
      { id: 'shower',  label: '手持花洒',x: 78, y: 40, category: 'shower', productId: 'shower-002' },
    ],
  },
  {
    id: 'bathroom-industrial',
    name: '工业风浴室',
    style: '工业风',
    description: '裸露质感，黑色铁件，做旧气息与现代功能融合。',
    imageUrl: 'https://images.unsplash.com/photo-1564540574859-0dfb63985953?w=1400&q=80',
    rooms: ['浴室'],
    variants: [
      'https://images.unsplash.com/photo-1564540574859-0dfb63985953?w=1400&q=80',
    ],
    hotspots: [
      { id: 'faucet',  label: '哑光龙头', x: 50, y: 60, category: 'faucet', productId: 'faucet-002' },
      { id: 'mirror',  label: '浴室镜',   x: 50, y: 28, category: 'mirror', productId: 'mirror-001' },
      { id: 'shower',  label: '花洒',     x: 80, y: 30, category: 'shower', productId: 'shower-001' },
    ],
  },
]

export default designs
