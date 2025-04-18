import { ref } from 'vue'
import OpenAI from 'openai'

interface LLMOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
}

export default function useLLM() {
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const streamingResponse = ref<string>('') // 用于流式输出的响应
  const responseCache = ref<Map<string, string>>(new Map())

  const settings = JSON.parse(localStorage.getItem('app-settings') || '{}')

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: settings.llmApiKey , // 从设置中获取或使用默认值
    dangerouslyAllowBrowser: true
  })

  const chat = async (text: string, options: LLMOptions = {}) => {
    try {
      // 检查缓存
      if (responseCache.value.has(text)) {
        streamingResponse.value = responseCache.value.get(text)!
        return streamingResponse.value
      }

      isLoading.value = true
      error.value = null
      streamingResponse.value = ''

      // 设置专门用于翻译的系统提示词
      const systemPrompt = options.systemPrompt || 
        '你是一个专业的翻译助手，请将用户输入的内容翻译成中文。保持专业、准确且流畅。'

      const stream = await openai.chat.completions.create({
        model: options.model || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          { role: 'user', content: text }
        ],
        temperature: options.temperature || 0.7, // 降低temperature提高翻译准确性
        max_tokens: options.maxTokens || 1000,
        stream: true
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        streamingResponse.value += content
      }

      // 流结束后存入缓存
      responseCache.value.set(text, streamingResponse.value)
      
      return streamingResponse.value
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    chat,
    streamingResponse, // 暴露流式响应
    isLoading,
    error
  }
}