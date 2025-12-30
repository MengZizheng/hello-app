// API 配置
const API_KEY = process.env.NANO_BANANA_API_KEY || 'sk-ioel5HwR6nA0CbeeOH91lN239XvDrKUPoZqy08dJdrJ0aehF';
const API_URL = 'https://api.apimart.ai/v1/images/generations';

// 角色映射
const CHARACTER_MAP = {
  '乌萨奇': 'usagi',
  '小八': 'hachiware',
  '吉伊': 'chiikawa'
};

// 尺寸映射
const SIZE_MAP = {
  '16:9': '16:9',
  '9:16': '9:16',
  '1:1': '1:1'
};

exports.handler = async (event) => {
  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { character, size, referenceImage } = JSON.parse(event.body);

    // 验证参数
    if (!character || !size) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '缺少必要参数' })
      };
    }

    // 构建提示词
    const characterEn = CHARACTER_MAP[character] || character;
    const prompt = `生成chiikawa风格的壁纸，${character}是主角，具备少量示意图的特征。`;

    // 构建请求体
    const payload = {
      model: 'gemini-3-pro-image-preview',
      prompt: prompt,
      size: SIZE_MAP[size] || '16:9',
      n: 1,
      resolution: '2K'
    };

    // 如果有参考图，添加到请求中
    if (referenceImage) {
      payload.image_urls = [{ url: referenceImage }];
    }

    console.log('提交任务:', JSON.stringify(payload));

    // 调用 API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    console.log('API 响应:', JSON.stringify(result));

    if (result.code !== 200) {
      throw new Error(`API 返回错误: ${JSON.stringify(result)}`);
    }

    const taskId = result.data[0].task_id;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        taskId: taskId
      })
    };

  } catch (error) {
    console.error('错误:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
