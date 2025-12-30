import { useState, useRef } from 'react'

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
  const [status, setStatus] = useState('idle')
  const [taskId, setTaskId] = useState(null)
  const [resultImage, setResultImage] = useState(null)
  const [waitingMessage, setWaitingMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef(null)

  const characters = ['吉伊', '小八', '乌萨奇']
  const sizes = ['16:9', '9:16', '1:1']

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setReferenceImage(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const removeReference = () => {
    setReferenceImage(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    setStatus('submitting')
    setErrorMessage('')

    try {
      let base64Image = null
      if (referenceImage) {
        base64Image = await fileToBase64(referenceImage)
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
      setErrorMessage(error.message)
      setStatus('error')
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
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(interval)
          setErrorMessage(data.failReason || '任务失败')
          setStatus('error')
        } else {
          setWaitingMessage(WAITING_MESSAGES[Math.floor(Math.random() * WAITING_MESSAGES.length)])
        }

      } catch (error) {
        clearInterval(interval)
        console.error('轮询错误:', error)
        setErrorMessage(error.message)
        setStatus('error')
      }
    }, 5000)
  }

  const handleRegenerate = () => {
    setResultImage(null)
    setStatus('idle')
    setTaskId(null)
    handleSubmit()
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
    } catch (error) {
      window.open(resultImage, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🌾 Chiikawa 壁纸生成器</h1>
          <p className="text-gray-600">选择角色，一键生成专属壁纸</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {status === 'idle' && (
            <div className="p-6 space-y-6">
              {/* Character Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  选择角色
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {characters.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCharacter(c)}
                      className={`py-3 px-4 rounded-xl font-medium transition-all ${
                        character === c
                          ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  选择尺寸
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`py-3 px-4 rounded-xl font-medium transition-all ${
                        size === s
                          ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  参考图（可选）
                </label>
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="参考图"
                      className="w-full h-32 object-cover rounded-xl"
                    />
                    <button
                      onClick={removeReference}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-all">
                    <span className="text-4xl mb-2">📷</span>
                    <span className="text-sm text-gray-500">点击上传参考图</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleSubmit}
                className="w-full py-4 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
              >
                ✨ 生成壁纸
              </button>
            </div>
          )}

          {/* Loading State */}
          {(status === 'submitting' || status === 'processing') && (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-pink-200 border-t-pink-500 mb-6"></div>
              <p className="text-lg font-semibold text-gray-800 mb-2">
                {status === 'submitting' ? '正在提交任务...' : waitingMessage}
              </p>
              {status === 'processing' && (
                <p className="text-sm text-gray-500">这可能需要 1-2 分钟，请耐心等待...</p>
              )}
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">😢</div>
              <p className="text-lg font-semibold text-red-600 mb-6">{errorMessage}</p>
              <button
                onClick={() => setStatus('idle')}
                className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
              >
                返回
              </button>
            </div>
          )}

          {/* Completed State */}
          {status === 'completed' && resultImage && (
            <div className="p-6 space-y-6">
              <div className="text-center mb-4">
                <p className="text-2xl font-bold text-gray-800">✨ 壁纸生成完成！</p>
              </div>

              <div className="rounded-xl overflow-hidden shadow-lg">
                <img src={resultImage} alt="生成的壁纸" className="w-full" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownload}
                  className="py-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  ⬇️ 下载
                </button>
                <button
                  onClick={handleRegenerate}
                  className="py-4 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
                >
                  🔄 重新生成
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          Made with ❤️ using AI
        </div>
      </div>
    </div>
  )
}

export default App
