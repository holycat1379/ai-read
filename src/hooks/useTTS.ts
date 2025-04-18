import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'

interface TTSOptions {
  voiceType?: string
  speed?: number
  volume?: number
  emotion?: string
  encoding?: 'wav' | 'pcm' | 'ogg_opus' | 'mp3'
  explicitLanguage?: string
}

export default function useTTS() {
  const isPlaying = ref(false)
  const error = ref<Error | null>(null)
  const audioBlob = ref<Blob | null>(null)
  const audioCache = ref<Map<string, Blob>>(new Map()) // 新增音频缓存

  const settings = JSON.parse(localStorage.getItem('app-settings') || '{}')

  const play = async (text: string, options: TTSOptions = {}) => {
    try {
      isPlaying.value = true
      error.value = null
      
      // 生成缓存key，包含文本和配置
      const cacheKey = `${text}-${JSON.stringify(options)}`
      
      // 检查缓存
      if (audioCache.value.has(cacheKey)) {
        audioBlob.value = audioCache.value.get(cacheKey)!
        const audioUrl = URL.createObjectURL(audioBlob.value)
        const audio = new Audio(audioUrl)
        
        audio.onended = () => isPlaying.value = false
        audio.play()
        return
      }

      audioBlob.value = null

      const appid = settings.ttsAppId 
      const token = settings.ttsToken 

      const requestData = {
        app: { appid, token, cluster: 'volcano_tts' },
        user: { uid: 'user123' },
        audio: {
          voice_type: options.voiceType || 'BV701_streaming',
          speed_ratio: options.speed || 1.0,
          encoding: options.encoding || 'mp3',
          explicit_language: options.explicitLanguage,
          ...(options.emotion ? { 
            emotion: options.emotion,
            enable_emotion: true 
          } : {})
        },
        request: {
          reqid: uuidv4(),
          text,
          operation: 'query' // 改为query模式
        }
      }

      const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
        method: 'POST',
        headers: {
          'Host':'openspeech.bytedance.com',
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer;${token}` // 注意使用分号分隔
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()
      
      if (result.code !== 3000) {
        throw new Error(`TTS Error ${result.code}: ${result.message}`)
      }

      // 解码base64音频数据
      const binaryString = atob(result.data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      audioBlob.value = new Blob([bytes], { type: `audio/${options.encoding || 'mp3'}` })
      audioCache.value.set(cacheKey, audioBlob.value) // 存入缓存
      
      const audioUrl = URL.createObjectURL(audioBlob.value)
      const audio = new Audio(audioUrl)
      
      audio.onended = () => isPlaying.value = false
      audio.play()

    } catch (err) {
      error.value = err as Error
      isPlaying.value = false
    }
  }

  const stop = () => {
    isPlaying.value = false
  }

  return {
    play,
    stop,
    isPlaying,
    error
  }
}