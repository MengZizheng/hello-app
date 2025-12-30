import { useState } from 'react'
import './App.css'

function App() {
  const [name, setName] = useState('')

  return (
    <div className="container">
      <div className="card">
        <h1>问候小工具</h1>
        <input
          type="text"
          placeholder="请输入你的名字"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
        {name && (
          <div className="greeting">
            hello，<span className="name">{name}</span>！
          </div>
        )}
      </div>
    </div>
  )
}

export default App
