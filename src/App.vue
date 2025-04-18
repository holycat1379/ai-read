<script setup lang="ts">
import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import EpubReader from './components/EpubReader.vue'
import { NSelect, NModal, NInput, NButton } from 'naive-ui'

const books = [
  { label: '十二法则', value: 'book/十二法则.epub' },
  { label: 'Jordan Peterson - 12 Rules for Life', value: 'book/Jordan_B_Peterson_12_Rules_for_Life_An_Antidot_z-lib_org.epub' }
]

const selectedBook = useLocalStorage('selected-book', books[0].value)
const showSettings = ref(false)

// 设置项
const settings = useLocalStorage('app-settings', {
  llmApiKey: '',
  ttsAppId: '',
  ttsToken: ''
})
</script>

<template>
  <div class="app">
    <div class="header">
      <div class="book-selector">
        <n-select v-model:value="selectedBook" :options="books" />
      </div>
      <n-button @click="showSettings = true">设置</n-button>
    </div>
    
    <EpubReader :url="selectedBook" />
    
    <!-- 设置弹窗 -->
    <n-modal v-model:show="showSettings" title="设置">
      <div class="settings-form">
        <div class="setting-item">
          <label>LLM API Key:</label>
          <n-input v-model:value="settings.llmApiKey" placeholder="输入LLM API Key" />
        </div>
        <div class="setting-item">
          <label>TTS App ID:</label>
          <n-input v-model:value="settings.ttsAppId" placeholder="输入TTS App ID" />
        </div>
        <div class="setting-item">
          <label>TTS Token:</label>
          <n-input v-model:value="settings.ttsToken" placeholder="输入TTS Token" />
        </div>
        <n-button type="primary" @click="showSettings = false">保存</n-button>
      </div>
    </n-modal>
  </div>
</template>

<style>
.app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #fff;
}

.book-selector {
  flex: 1;
  max-width: 400px;
}

.settings-form {
  padding: 20px;
  background: #fff;
}

.setting-item {
  margin-bottom: 15px;
}

.setting-item label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
</style>
