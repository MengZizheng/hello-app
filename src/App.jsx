import { useState, useRef } from 'react'
import {
  Button,
  Radio,
  ImageUploader,
  Toast,
  Swiper,
  DotLoading,
  Card,
  Space,
  Modal,
} from 'antd-mobile'
import {
  AddOutline,
  DownloadOutline,
  RetryOutline,
} from 'antd-mobile-icons'
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
  const [referenceImage, setReferenceImage] = useState([])
  const [status, setStatus] = useState('idle')
  const [taskId, setTaskId] = useState(null)
  const [resultImage, setResultImage] = useState(null)
  const [waitingMessage, setWaitingMessage] = useState('')
  const fileInputRef = useRef(null)

  const characters = [
    { label: '吉伊', value: '吉伊' },
    { label: '小八', value: '小八' },
    { label: '乌萨奇', value: '乌萨奇' },
  ]

  const sizes = [
    { label: '16:9', value: '16:9' },
    { label: '9:16', value: '9:16' },
    { label: '1:1', value: '1:1' },
  ]

  // 处理图片上传
  const handleImageUpload = (files) => {
    if (files.length > 0) {
      setReferenceImage(files)
    }
  }

  // 提交生成任务
  const handleSubmit = async () => {
    setStatus('submitting')

    try {
      let base64Image = null
      if (referenceImage.length > 0) {
        const file = referenceImage[0].originFile
        base64Image = await fileToBase64(file)
      }

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

      pollTaskStatus(data.taskId)

    } catch (error) {
      console.error('提交错误:', error)
      Toast.show({
        content: error.message,
        icon: 'fail',
      })
      setStatus('idle')
    }
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

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
          Toast.show({
            content: '壁纸生成完成！',
            icon: 'success',
          })
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(interval)
          Toast.show({
            content: data.failReason || '任务失败',
            icon: 'fail',
          })
          setStatus('idle')
        } else {
          setWaitingMessage(WAITING_MESSAGES[Math.floor(Math.random() * WAITING_MESSAGES.length)])
        }

      } catch (error) {
        clearInterval(interval)
        console.error('轮询错误:', error)
        Toast.show({
          content: error.message,
          icon: 'fail',
        })
        setStatus('idle')
      }
    }, 5000)
  }

  const handleRegenerate = () => {
    setResultImage(null)
    setStatus('idle')
    setTaskId(null)
  }

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
      Toast.show({ content: '下载成功', icon: 'success' })
    } catch (error) {
      window.open(resultImage, '_blank')
    }
  }

  return (
    <div className="app-container">
      {/* 头部 */}
      <div className="header">
        <h1 className="title">🌾 Chiikawa 壁纸生成器</h1>
        <p className="subtitle">选择角色，一键生成专属壁纸</p>
      </div>

      {/* 主内容区 */}
      <div className="content">
        {/* 输入表单 */}
        {status === 'idle' && (
          <Space direction="vertical" block style={{ '--gap': '16px' }}>
            {/* 角色选择 */}
            <Card title="选择角色">
              <Radio.Group
                value={character}
                onChange={(val) => setCharacter(val)}
                defaultValue="吉伊"
              >
                <Space direction="vertical">
                  {characters.map((c) => (
                    <Radio
                      key={c.value}
                      value={c.value}
                      className="custom-radio"
                    >
                      {c.label}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </Card>

            {/* 尺寸选择 */}
            <Card title="选择尺寸">
              <Radio.Group
                value={size}
                onChange={(val) => setSize(val)}
              >
                <Space direction="vertical">
                  {sizes.map((s) => (
                    <Radio
                      key={s.value}
                      value={s.value}
                      className="custom-radio"
                    >
                      {s.label}
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            </Card>

            {/* 参考图上传 */}
            <Card title="参考图（可选）">
              <ImageUploader
                value={referenceImage}
                onChange={handleImageUpload}
                upload={() => Promise.resolve('')}
                maxCount={1}
                accept="image/*"
              >
                <div className="upload-trigger">
                  <AddOutline fontSize={32} />
                  <span>点击上传</span>
                </div>
              </ImageUploader>
            </Card>

            {/* 生成按钮 */}
            <Button
              block
              size="large"
              color="primary"
              onClick={handleSubmit}
            >
              ✨ 生成壁纸
            </Button>
          </Space>
        )}

        {/* 处理中 */}
        {(status === 'submitting' || status === 'processing') && (
          <Card className="loading-card">
            <div className="loading-content">
              <DotLoading color="primary" />
              <div className="loading-text">
                {status === 'submitting' ? '正在提交任务...' : waitingMessage}
              </div>
              <div className="loading-hint">
                {status === 'processing' && '这可能需要 1-2 分钟，请耐心等待...'}
              </div>
            </div>
          </Card>
        )}

        {/* 生成完成 */}
        {status === 'completed' && resultImage && (
          <Space direction="vertical" block style={{ '--gap': '16px' }}>
            <Card title="生成结果">
              <img
                src={resultImage}
                alt="生成的壁纸"
                className="result-image"
              />
            </Card>

            <Space direction="horizontal" block style={{ '--gap': '12px' }}>
              <Button
                block
                size="large"
                color="primary"
                onClick={handleDownload}
              >
                <DownloadOutline /> 下载
              </Button>
              <Button
                block
                size="large"
                color="default"
                onClick={handleRegenerate}
              >
                <RetryOutline /> 重新生成
              </Button>
            </Space>
          </Space>
        )}
      </div>
    </div>
  )
}

export default App
