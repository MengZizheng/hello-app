import { useState, useRef } from 'react'
import './App.css'

// Chiikawa 主题等待文案
const WAITING_MESSAGES = [
  '正在除草中...',
  '正在阅读除草指南...',
  '正在讨伐中...',
  '正在美甲中...',
  '正在烤番薯中...',
  '正在拉面店打工中...',
  '正在做家务中...',
  '正在练习魔法中...',
  '正在卖烤番薯中...'
]

function App() {
  const [character, setCharacter] = useState('吉伊')
  const [size, setSize] = useState('16:9')
  const [referenceImage, setReferenceImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle') // idle, submitting, processing, completed, error
  const [taskId, setTaskId] = useState(null)
  const [resultImage, setResultImage] = useState(null)
  const [waitingMessage, setWaitingMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef(null)

  // 角色选项
  const characters = ['吉伊', '小八', '乌萨奇']
  const sizes = ['16:9', '9:16', '1:1']

  // 处理文件上传
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setReferenceImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // 移除参考图
  const removeReference = () => {
    setReferenceImage(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 提交生成任务
  const handleSubmit = async () => {
    setStatus('submitting')
    setErrorMessage('')

    try {
      // 如果有参考图，转换为 base64
      let base64Image = null
      if (referenceImage) {
        base64Image = await fileToBase64(referenceImage)
      }

      // 调用提交 API
      const response = await fetch('/.netlify/functions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character,
          size,
          referenceImage: base64Image
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || '提交失败')
      }

      setTaskId(data.taskId)
      setStatus('processing')
      setWaitingMessage(WAITING_MESSAGES[Math.floor(Math.random() * WAITING_MESSAGES.length)])

      // 开始轮询任务状态
      pollTaskStatus(data.taskId)

    } catch (error) {
      console.error('提交错误:', error)
      setErrorMessage(error.message)
      setStatus('error')
    }
  }

  // 文件转 base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // 轮询任务状态
  const pollTaskStatus = async (id) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/.netlify/functions/status?taskId=${id}`)
        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || '查询失败')
        }

        if (data.status === 'completed') {
          clearInterval(interval)
          setResultImage(data.imageUrl)
          setStatus('completed')
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(interval)
          setErrorMessage(data.failReason || '任务失败')
          setStatus('error')
        } else {
          // 更新等待文案
          setWaitingMessage(WAITING_MESSAGES[Math.floor(Math.random() * WAITING_MESSAGES.length)])
        }

      } catch (error) {
        clearInterval(interval)
        console.error('轮询错误:', error)
        setErrorMessage(error.message)
        setStatus('error')
      }
    }, 5000) // 每 5 秒查询一次
  }

  // 重新生成
  const handleRegenerate = () => {
    setResultImage(null)
    setStatus('idle')
    setTaskId(null)
    handleSubmit()
  }

  // 下载图片
  const handleDownload = async () => {
    try {
      const response = await fetch(resultImage)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chiikawa-${character}-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载失败:', error)
      // 如果跨域失败，直接打开新标签页
      window.open(resultImage, '_blank')
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">🌾 Chiikawa 壁纸生成器</h1>

        {/* 输入界面 */}
        {status === 'idle' && (
          <div className="form">
            {/* 角色选择 */}
            <div className="form-group">
              <label className="label">选择角色</label>
              <div className="character-grid">
                {characters.map((c) => (
                  <button
                    key={c}
                    className={`character-btn ${character === c ? 'active' : ''}`}
                    onClick={() => setCharacter(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* 尺寸选择 */}
            <div className="form-group">
              <label className="label">选择尺寸</label>
              <div className="size-grid">
                {sizes.map((s) => (
                  <button
                    key={s}
                    className={`size-btn ${size === s ? 'active' : ''}`}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 参考图上传 */}
            <div className="form-group">
              <label className="label">参考图（可选）</label>
              <div className="upload-area">
                {previewUrl ? (
                  <div className="preview">
                    <img src={previewUrl} alt="参考图" />
                    <button className="remove-btn" onClick={removeReference}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="upload-btn">
                    <span className="upload-icon">📷</span>
                    <span>点击上传参考图</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* 生成按钮 */}
            <button className="generate-btn" onClick={handleSubmit}>
              ✨ 生成壁纸
            </button>
          </div>
        )}

        {/* 提交中 */}
        {status === 'submitting' && (
          <div className="loading">
            <div className="spinner"></div>
            <p>正在提交任务...</p>
          </div>
        )}

        {/* 处理中 */}
        {status === 'processing' && (
          <div className="loading">
            <div className="spinner"></div>
            <p className="waiting-text">{waitingMessage}</p>
            <p className="hint">这可能需要 1-2 分钟，请耐心等待...</p>
          </div>
        )}

        {/* 错误 */}
        {status === 'error' && (
          <div className="error">
            <p className="error-text">❌ {errorMessage}</p>
            <button className="retry-btn" onClick={() => setStatus('idle')}>
              返回
            </button>
          </div>
        )}

        {/* 完成 */}
        {status === 'completed' && resultImage && (
          <div className="result">
            <h2 className="result-title">✨ 壁纸生成完成！</h2>
            <div className="result-image">
              <img src={resultImage} alt="生成的壁纸" />
            </div>
            <div className="result-actions">
              <button className="download-btn" onClick={handleDownload}>
                ⬇️ 下载
              </button>
              <button className="regenerate-btn" onClick={handleRegenerate}>
                🔄 重新生成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
