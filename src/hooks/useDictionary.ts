import { ref, onMounted, onUnmounted } from 'vue'

interface DictOptions {
  jsonversion?: '1' | '2'
  client?: string
  dicts?: string[][]
}

export default function useDictionary() {
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const definition = ref<string>('')
  const audioUrl = ref<string>('')

  const lookup = async (word: string, options: DictOptions = {}) => {
    try {
      isLoading.value = true
      error.value = null
      definition.value = ''
      audioUrl.value = ''

      // 获取发音
      audioUrl.value = `http://dict.youdao.com/dictvoice?type=0&audio=${encodeURIComponent(word)}`

      // 获取释义
      const params = new URLSearchParams({
        jsonversion: options.jsonversion || '2',
        client: options.client || 'mobile',
        q: word,
        ...(options.dicts && { dicts: JSON.stringify({ count: 99, dicts: options.dicts }) })
      })

      const response = await fetch(`http://dict.youdao.com/jsonapi?${params.toString()}`)
      const data = await response.json()

      // 解析释义
      if (data.ec && data.ec.word) {
        const wordData = data.ec.word[0]
        definition.value = wordData.trs?.map((tr: any) => tr.tr[0].l.i[0]).join('\n') || '未找到释义'
      } else {
        definition.value = '未找到释义'
      }

      // 播放发音
      const audio = new Audio(audioUrl.value)
      audio.play()

      return { definition: definition.value, audioUrl: audioUrl.value }
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const handleClick = async (event: MouseEvent) => {
    console.log('click')
    const iframe = document.querySelector('iframe') // 获取epub.js的iframe
    const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document
    
    if (!iframeDoc) return
    
    const selection = iframeDoc.getSelection()

    console.log(selection)
    // 获取选中的文本
    if (selection && selection.toString().trim()) {
      const word = selection.toString().trim()
      if (word.length > 0 && word.split(/\s+/).length === 1) {
        await lookup(word)
      }
    }
  }

  const setupListeners = () => {
    // 等待iframe加载完成
    const checkIframe = setInterval(() => {
      const iframe = document.querySelector('iframe')
      console.log(iframe)
      if (iframe) {
        clearInterval(checkIframe)
        iframe.addEventListener('load', () => {
          iframe.contentDocument?.addEventListener('click', handleClick)
        })
      }
    }, 100)
  }

  const removeListeners = () => {
    const iframe = document.querySelector('iframe')
    if (iframe) {
      iframe.contentDocument?.removeEventListener('click', handleClick)
    }
  }

  onMounted(() => {
    // setupListeners()
  })

  onUnmounted(() => {
    // removeListeners()
  })

  return {
    lookup,
    definition,
    audioUrl,
    isLoading,
    error,
    setupListeners, // 暴露方法以便手动控制
    removeListeners
  }
}