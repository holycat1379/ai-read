<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import ePub from 'epubjs'
import useTTS from '../hooks/useTTS'
import useLLM from '../hooks/useLLM'
import useDictionary from '../hooks/useDictionary'

// 初始化各功能模块
const { play, isPlaying, error: ttsError } = useTTS()
const { chat, streamingResponse } = useLLM()
const { lookup } = useDictionary()

// 组件属性
const props = defineProps<{
  url: string // EPUB文件路径
}>()

// DOM引用
const viewerRef = ref<HTMLElement | null>(null)

// EPUB相关状态
const rendition = ref<any>(null) // EPUB渲染实例
const book = ref<any>(null) // EPUB书籍实例
const currentPercent = ref<number>(0) // 当前阅读进度

// 响应数据
const replyContent = ref<string>('') // AI回复内容

/**
 * 处理AI聊天请求
 * @param text 要发送的文本
 */
const handleChat = async (text: string) => {
  
  // 获取AI回复
  const reply = await chat(text, {
    model: 'deepseek-chat',
    temperature: 0.8
  })
  replyContent.value = reply
}

/**
 * 处理文本朗读请求
 * @param text 要朗读的文本
 */
const handlePlay = (text: string) => {
  play(text, {
    voiceType: 'en_female_amanda_mars_bigtts'
  })
}

/**
 * 初始化EPUB阅读器
 */
const initReader = () => {
  if (!viewerRef.value) return

  // 清理现有实例
  cleanupReader()

  // 创建新实例
  book.value = ePub(props.url)
  setupRendition()

  // 初始化位置信息
  initLocations().then(restoreReadingPosition)
}

/**
 * 清理阅读器实例
 */
const cleanupReader = () => {
  if (book.value) {
    book.value.destroy()
    book.value = null
    rendition.value = null
  }
}

/**
 * 设置EPUB渲染
 */
const setupRendition = () => {
  rendition.value = book.value.renderTo(viewerRef.value, {
    width: viewerRef.value.clientWidth,
    height: '100%',
    spread: 'none',
    flow: 'paginated',
    minSpreadWidth: 0
  })

  // 监听位置变化
  rendition.value.on('relocated', handleLocationChange)
  
  // 添加文本处理钩子
  rendition.value.hooks.content.register(processParagraphs)
}

/**
 * 初始化位置信息
 */
const initLocations = async () => {
  const key = `${props.url}-locations`
  const storedLocations = localStorage.getItem(key)
  
  if (storedLocations) {
    await book.value.locations.load(storedLocations)
  } else {
    await book.value.locations.generate(1600)
    localStorage.setItem(key, book.value.locations.save())
  }
}

/**
 * 恢复阅读位置
 */
const restoreReadingPosition = () => {
  const savedCfi = localStorage.getItem(`${props.url}-cfi`)
  if (!savedCfi) {
    rendition.value.display()
    return
  }

  try {
    rendition.value.display(savedCfi)
    updateReadingProgress(savedCfi)
    console.log('恢复阅读位置成功:', savedCfi)
  } catch (error) {
    console.error('恢复阅读位置失败:', error)
    rendition.value.display()
  }
}

/**
 * 处理位置变化
 */
const handleLocationChange = (location: any) => {
  if (!location?.start) return
  
  const cfi = location.start.cfi
  localStorage.setItem(`${props.url}-cfi`, cfi)
  updateReadingProgress(cfi)
}

/**
 * 更新阅读进度
 */
const updateReadingProgress = (cfi: string) => {
  const percent = book.value.locations.percentageFromCfi(cfi)
  currentPercent.value = Math.floor(percent * 100)
}

/**
 * 处理段落内容，添加功能按钮
 */
const processParagraphs = (contents: any) => {
  const body = contents.window.document.body
  const paragraphs = body.getElementsByTagName('p')

  for (let p of paragraphs) {
    const sentences = extractSentences(p.innerHTML)
    p.innerHTML = addActionButtons(sentences)
    setupButtonEvents(p, contents.window.document)
  }
}

/**
 * 从HTML中提取句子
 */
const extractSentences = (html: string) => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  const textContent = tempDiv.textContent || ''
  return textContent.match(/[^.!?;。！？；]+[.!?;。！？；]\s*/g) || [textContent]
}

/**
 * 为句子添加功能按钮
 */
const addActionButtons = (sentences: string[]) => {
  return sentences.map(sentence => 
    sentence.trim() ? 
      `${sentence.trim()}
      <button class="click-btn sentence-btn" type="text" data-sentence="${sentence.trim()}">🔊</button>
      <button class="click-btn translate-btn" type="text" data-sentence="${sentence.trim()}">🌐</button>
      <br>` : ''
  ).join('')
}

/**
 * 设置按钮点击事件
 */
const setupButtonEvents = (paragraph: HTMLParagraphElement, doc: Document) => {
  const buttons = paragraph.querySelectorAll('.sentence-btn, .translate-btn')
  buttons.forEach(button => {
    button.addEventListener('click', (event) => {
      const button = event.target as HTMLButtonElement
      const sentence = button.getAttribute('data-sentence')
      if (!sentence) return

      if (button.classList.contains('sentence-btn')) {
        handlePlay(sentence.trim())
      } else {
        handleChat(sentence.trim())
      }
    })
  })
}

// 页面导航功能
const nextPage = () => rendition.value?.next()
const prevPage = () => rendition.value?.prev()
const jumpToPercent = (percent: number) => {
  if (book.value?.locations) {
    rendition.value.display(book.value.locations.cfiFromPercentage(percent / 100))
  }
}

// 生命周期钩子
onMounted(initReader)
watch(() => props.url, initReader)
</script>

<template>
  <div class="epub-reader">
    <!-- 阅读器视图 -->
    <div class="viewer" ref="viewerRef"></div>
    
    <!-- 控制栏 -->
    <div class="controls">
      <button @click="prevPage">上一页</button>
      <button @click="nextPage">下一页</button>
    </div>
    
    <!-- AI回复区域 -->
    <div class="reply-container">
      <div class="reply-content">{{ streamingResponse }}</div>
    </div>
  </div>
</template>

<style scoped>
/* 样式保持不变 */
.epub-reader {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.viewer {
  flex: 1;
  overflow: hidden;
}

.controls {
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  background: #f5f5f5;
}

.progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  max-width: 400px;
}

.reply-container {
  padding: 1rem;
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  height: 120px;
  overflow-y: auto;
}

.click-btn {
  border: none;
  cursor: pointer;
  color: #007bff;
  background-color: transparent;
  padding: 0 4px;
}
</style>