// API 配置
const API_KEY = process.env.NANO_BANANA_API_KEY || 'sk-ioel5HwR6nA0CbeeOH91lN239XvDrKUPoZqy08dJdrJ0aehF';

exports.handler = async (event) => {
  // 只允许 GET 请求
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 从查询参数获取 taskId
    const taskId = event.queryStringParameters.taskId;

    if (!taskId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: '缺少 taskId 参数' })
      };
    }

    // 调用 API 查询任务状态
    const url = `https://api.apimart.ai/v1/tasks/${taskId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    const result = await response.json();

    console.log('状态查询:', JSON.stringify(result));

    if (result.code !== 200) {
      throw new Error(`API 返回错误: ${JSON.stringify(result)}`);
    }

    const data = result.data;
    const status = data.status;

    // 如果完成，提取图片 URL
    let imageUrl = null;
    if (status === 'completed') {
      try {
        imageUrl = data.result.images[0].url[0].trim();
      } catch (e) {
        throw new Error('解析图片 URL 失败');
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        status: status,      // processing, completed, failed, cancelled
        progress: data.progress || 0,
        imageUrl: imageUrl,
        failReason: data.fail_reason || null
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
