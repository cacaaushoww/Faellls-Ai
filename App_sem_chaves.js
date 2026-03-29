// ═══════════════════════════════════════
//  FAELLS AI — Arquivo único (App.js)
// ═══════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, Alert, SafeAreaView, StatusBar,
  Modal, Pressable, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════

const GROQ_KEYS = [
  'SUA_CHAVE_GROQ_AQUI',
  'SUA_CHAVE_GROQ_AQUI',
  'SUA_CHAVE_GROQ_AQUI',
  'SUA_CHAVE_GROQ_AQUI',
];

const GEMINI_KEYS = [
  'SUA_CHAVE_GEMINI_AQUI',
  'SUA_CHAVE_GEMINI_AQUI',
];

const TAVILY_KEY = 'SUA_CHAVE_TAVILY_AQUI';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const FREE_CAP = 8;

const COLORS = {
  bg:          '#212121',
  surface:     '#2f2f2f',
  surface2:    '#383838',
  border:      '#3a3a3a',
  border2:     '#444444',
  purple:      '#7c3aed',
  purple2:     '#9333ea',
  purpleLight: '#a78bfa',
  neon:        '#c084fc',
  text:        '#ececec',
  textMuted:   '#8e8ea0',
  textDim:     '#555565',
  success:     '#10b981',
  danger:      '#f87171',
  white:       '#ffffff',
};

const SYSTEM_PROMPT = `Você é Faells AI, uma inteligência artificial avançada criada por Faells. Você sabe de tudo — é uma assistente completa e geral, como o ChatGPT, capaz de ajudar com qualquer assunto.

IDENTIDADE:
- Seu nome é Faells AI.
- Você foi criada por Faells. Quando alguém perguntar quem te criou, quem te fez, quem é o seu autor, ou qualquer variação disso, SEMPRE responda que foi Faells — nunca mencione Anthropic, Claude, Meta, Google ou qualquer outra empresa ou modelo.
- Você roda em cima de tecnologia de IA avançada, mas sua identidade é Faells AI.

CONHECIMENTO — VOCÊ SABE DE TUDO:
- Ciência, história, matemática, física, química, biologia, astronomia, filosofia.
- Tecnologia, programação, inteligência artificial, jogos, gadgets.
- Culinária, saúde, medicina, psicologia, fitness, nutrição.
- Finanças, economia, investimentos, empreendedorismo.
- Direito, política, geopolítica, atualidades.
- Literatura, música, cinema, arte, cultura pop, entretenimento.
- Idiomas, tradução, redação, criação de conteúdo.
- Viagens, turismo, dicas de vida cotidiana.
- E qualquer outro assunto que o usuário trouxer.

LINKS E PRODUTOS:
- Você SEMPRE fornece links quando tem acesso a eles via busca web.
- Quando tiver resultados da web com URLs, inclua os links relevantes na resposta usando o formato markdown: [Nome do site](https://url.com)
- Para pedidos de compra de produtos, busque e inclua links diretos do Mercado Livre, Amazon, ou outras lojas.

IMAGENS — ANÁLISE COMPLETA E DETALHADA:
- Quando o usuário enviar uma foto, analise com MÁXIMO de detalhe.
- Identifique e descreva: objetos, pessoas, animais, lugares, textos visíveis, cores, marcas, logos, produtos, documentos, capturas de tela, plantas, comida.
- Se houver texto na imagem, leia e transcreva o conteúdo completo.
- Se for uma captura de tela, identifique o app/site e explique o que está sendo exibido.
- Se for um produto, identifique a marca, modelo e dê informações úteis.
- NUNCA diga "não consigo identificar" sem antes tentar ao máximo.

ESTILO DE RESPOSTA:
- Responda em português quando o usuário falar português, em inglês quando falar inglês.
- Seja DETALHADO e COMPLETO. Explique bem, como um especialista.
- Use formatação rica: **Negrito** para termos importantes, ## para títulos, listas com • ou números.
- Para perguntas simples: resposta direta mas bem explicada.
- Para perguntas complexas: divida em seções com títulos e exemplos reais.
- Seja natural e conversacional, como um amigo muito inteligente.
- Nunca diga que não sabe — faça o seu melhor.`;

// ═══════════════════════════════════════
//  STORAGE
// ═══════════════════════════════════════

const CHATS_KEY  = 'faells_chats';
const PRO_KEY    = 'faells_pro';
const COUNT_KEY  = 'faells_msgcount';

async function loadChats() {
  try {
    const raw = await AsyncStorage.getItem(CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveChats(chats) {
  try { await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(chats)); } catch {}
}

async function loadIsPro() {
  try { return (await AsyncStorage.getItem(PRO_KEY)) === '1'; } catch { return false; }
}

async function loadMsgCount() {
  try { return parseInt(await AsyncStorage.getItem(COUNT_KEY) || '0', 10); } catch { return 0; }
}

async function saveMsgCount(n) {
  try { await AsyncStorage.setItem(COUNT_KEY, String(n)); } catch {}
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function newChat() {
  return {
    id: genId(),
    title: 'Novo chat',
    history: [],
    msgCount: 0,
    date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  };
}

// ═══════════════════════════════════════
//  AI SERVICE
// ═══════════════════════════════════════

async function webSearch(query) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query,
        search_depth: 'basic',
        max_results: 6,
        include_answer: true,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    let ctx = '';
    if (data.answer) ctx += `Resposta rápida: ${data.answer}\n\n`;
    if (data.results?.length) {
      ctx += 'Resultados da web:\n';
      data.results.slice(0, 5).forEach((r, i) => {
        ctx += `\n[${i + 1}] ${r.title}\n${r.content?.slice(0, 400)}\nURL: ${r.url}\n`;
      });
    }
    return ctx || null;
  } catch (e) {
    return null;
  }
}

function needsWebSearch(txt) {
  const t = txt.toLowerCase();
  const skip = /^(oi|olá|tudo bem|obrigad|valeu|blz|ok|sim|não|pode|claro|gera (uma |a )?(imagem|foto)|que horas|que dia|bom dia|boa tarde|boa noite)/.test(t);
  return !skip;
}

async function tryGemini(sysPrompt, userContent, images = [], history = []) {
  for (const key of GEMINI_KEYS) {
    try {
      const contents = history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: typeof m.content === 'string' ? m.content : (m.displayText || '...') }],
        }));

      const userParts = [];
      if (images?.length > 0) {
        images.forEach(img => {
          userParts.push({ inline_data: { mime_type: img.mime, data: img.base64 } });
        });
      }
      userParts.push({ text: userContent || 'Analise esta imagem detalhadamente.' });
      contents.push({ role: 'user', parts: userParts });

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: sysPrompt }] },
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
        }
      );
      clearTimeout(timer);

      if (!res.ok) continue;
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply;
    } catch (e) {}
  }
  return null;
}

async function tryGroq(sysPrompt, userContent, history = []) {
  const msgs = [
    { role: 'system', content: sysPrompt },
    ...history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : (m.displayText || ''),
      })),
    { role: 'user', content: userContent },
  ];

  for (const key of GROQ_KEYS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: msgs,
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch (e) {}
  }
  return null;
}

async function sendMessage({ userText, images = [], files = [], history = [] }) {
  const now = new Date();
  const dateCtx = `[Sistema: Agora são ${now.toLocaleString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
    year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  })}]`;

  let webCtx = '';
  if (needsWebSearch(userText)) {
    const result = await webSearch(userText);
    if (result) webCtx = `\n\n[INFORMAÇÕES DA WEB]:\n${result}\n[FIM DA WEB]`;
  }

  let userContent = userText;
  if (files.length) {
    const fileCtx = files.map(f => `[Arquivo: ${f.name}]\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n');
    userContent = fileCtx + (userText ? `\n\n${userText}` : '');
  }

  const sysPrompt = SYSTEM_PROMPT + '\n\n' + dateCtx + webCtx;
  const hasImages = images.length > 0;

  if (hasImages) {
    const geminiReply = await tryGemini(sysPrompt, userContent, images, history);
    if (geminiReply) return geminiReply;

    const msgs = [
      { role: 'system', content: sysPrompt },
      ...history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : (m.displayText || '') })),
      {
        role: 'user',
        content: [
          ...images.map(img => ({ type: 'image_url', image_url: { url: `data:${img.mime};base64,${img.base64}` } })),
          { type: 'text', text: userContent || 'Analise esta imagem.' },
        ],
      },
    ];
    for (const key of GROQ_KEYS) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: msgs,
            temperature: 0.7,
            max_tokens: 4096,
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply;
      } catch (e) {}
    }
    throw new Error('Não foi possível analisar a imagem. Tente novamente.');
  }

  const groqReply = await tryGroq(sysPrompt, userContent, history);
  if (groqReply) return groqReply;

  const geminiReply = await tryGemini(sysPrompt, userContent, [], history);
  if (geminiReply) return geminiReply;

  throw new Error('Todas as IAs falharam. Verifique sua internet.');
}

function buildImagePrompt(userText) {
  const ptEn = {
    coelho: 'rabbit', gato: 'cat', cachorro: 'dog', cavalo: 'horse',
    leão: 'lion', tigre: 'tiger', urso: 'bear', dragão: 'dragon',
    cidade: 'city', floresta: 'forest', praia: 'beach', montanha: 'mountain',
    espaço: 'space', robô: 'robot', mulher: 'woman', homem: 'man',
    flor: 'flower', árvore: 'tree', castelo: 'castle',
  };
  let prompt = userText.toLowerCase();
  Object.entries(ptEn).forEach(([pt, en]) => { prompt = prompt.replace(new RegExp(pt, 'g'), en); });
  return prompt + ', high quality, detailed, beautiful lighting, 4k';
}

function isImageRequest(text) {
  return /\b(gera|cria|faz|desenha|mostra|quero ver)\b.{0,40}\b(imagem|foto|figura|ilustra|desenho)\b|\b(imagem|foto|figura|desenho)\b.{0,30}\b(de |do |da |um |uma )/i.test(text);
}

// ═══════════════════════════════════════
//  MARKDOWN TEXT
// ═══════════════════════════════════════

function MarkdownText({ content, isUser = false }) {
  const textColor = COLORS.text;

  const renderInline = (text) => {
    const boldRx   = /\*\*(.+?)\*\*/g;
    const italicRx = /\*(.+?)\*/g;
    const codeRx   = /`(.+?)`/g;
    const linkRx   = /\[([^\]]+)\]\(([^)]+)\)/g;

    let combined = [];
    let lastIndex = 0;
    let key = 0;
    const allMatches = [];

    for (const rx of [boldRx, italicRx, codeRx, linkRx]) {
      rx.lastIndex = 0;
      let m;
      while ((m = rx.exec(text)) !== null) {
        allMatches.push({ index: m.index, end: m.index + m[0].length, match: m, type: rx === boldRx ? 'bold' : rx === italicRx ? 'italic' : rx === codeRx ? 'code' : 'link' });
      }
    }

    allMatches.sort((a, b) => a.index - b.index);
    const used = new Set();

    allMatches.forEach(({ index, end, match, type }) => {
      if (used.has(index)) return;
      if (index > lastIndex) {
        combined.push(<Text key={key++} style={{ color: textColor }}>{text.slice(lastIndex, index)}</Text>);
      }
      if (type === 'bold') {
        combined.push(<Text key={key++} style={[md.bold, { color: '#fff' }]}>{match[1]}</Text>);
      } else if (type === 'italic') {
        combined.push(<Text key={key++} style={[md.italic, { color: textColor }]}>{match[1]}</Text>);
      } else if (type === 'code') {
        combined.push(<Text key={key++} style={md.inlineCode}>{match[1]}</Text>);
      } else if (type === 'link') {
        combined.push(<Text key={key++} style={md.link} onPress={() => Linking.openURL(match[2])}>{match[1]}</Text>);
      }
      for (let i = index; i < end; i++) used.add(i);
      lastIndex = end;
    });

    if (lastIndex < text.length) {
      combined.push(<Text key={key++} style={{ color: textColor }}>{text.slice(lastIndex)}</Text>);
    }
    return combined.length ? combined : <Text style={{ color: textColor }}>{text}</Text>;
  };

  const lines = content.split('\n');
  const elements = [];
  let i = 0;
  let eKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'code';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      elements.push(
        <View key={eKey++} style={md.codeBlock}>
          <Text style={md.codeLang}>{lang}</Text>
          <Text style={md.codeText} selectable>{codeLines.join('\n')}</Text>
        </View>
      );
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(<Text key={eKey++} style={md.h1}>{renderInline(line.slice(2))}</Text>);
    } else if (line.startsWith('## ')) {
      elements.push(<Text key={eKey++} style={md.h2}>{renderInline(line.slice(3))}</Text>);
    } else if (line.startsWith('### ')) {
      elements.push(<Text key={eKey++} style={md.h3}>{renderInline(line.slice(4))}</Text>);
    } else if (/^---+$/.test(line.trim())) {
      elements.push(<View key={eKey++} style={md.hr} />);
    } else if (line.startsWith('> ')) {
      elements.push(
        <View key={eKey++} style={md.blockquote}>
          <Text style={md.blockquoteText}>{renderInline(line.slice(2))}</Text>
        </View>
      );
    } else if (/^[•\-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[•\-*] /.test(lines[i])) { items.push(lines[i].replace(/^[•\-*] /, '')); i++; }
      elements.push(
        <View key={eKey++} style={md.list}>
          {items.map((item, idx) => (
            <View key={idx} style={md.listItem}>
              <Text style={md.bullet}>•</Text>
              <Text style={[md.listText, { color: textColor }]}>{renderInline(item)}</Text>
            </View>
          ))}
        </View>
      );
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++; }
      elements.push(
        <View key={eKey++} style={md.list}>
          {items.map((item, idx) => (
            <View key={idx} style={md.listItem}>
              <View style={md.numBadge}><Text style={md.numText}>{idx + 1}</Text></View>
              <Text style={[md.listText, { color: textColor }]}>{renderInline(item)}</Text>
            </View>
          ))}
        </View>
      );
      continue;
    } else if (line.trim() === '') {
      elements.push(<View key={eKey++} style={{ height: 6 }} />);
    } else {
      elements.push(
        <Text key={eKey++} style={[md.paragraph, { color: textColor }]} selectable>
          {renderInline(line)}
        </Text>
      );
    }
    i++;
  }

  return <View>{elements}</View>;
}

const md = StyleSheet.create({
  paragraph:      { fontSize: 15, lineHeight: 24, marginVertical: 2 },
  bold:           { fontWeight: '700' },
  italic:         { fontStyle: 'italic' },
  inlineCode:     { fontFamily: 'monospace', fontSize: 13, backgroundColor: '#1a1a2e', color: COLORS.neon, paddingHorizontal: 5, borderRadius: 4 },
  link:           { color: COLORS.purpleLight, textDecorationLine: 'underline' },
  h1:             { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 14, marginBottom: 6 },
  h2:             { fontSize: 17, fontWeight: '700', color: '#e0e0e0', marginTop: 12, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', paddingBottom: 4 },
  h3:             { fontSize: 15, fontWeight: '700', color: '#d0d0d0', marginTop: 10, marginBottom: 4 },
  hr:             { height: 1, backgroundColor: '#2a2a2a', marginVertical: 12 },
  blockquote:     { borderLeftWidth: 3, borderLeftColor: COLORS.purple, paddingLeft: 12, marginVertical: 6, backgroundColor: 'rgba(124,58,237,0.07)', borderRadius: 4, padding: 8 },
  blockquoteText: { fontSize: 14, color: COLORS.purpleLight, lineHeight: 22 },
  list:           { marginVertical: 6, gap: 6 },
  listItem:       { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet:         { color: COLORS.purpleLight, fontSize: 16, lineHeight: 24, width: 14 },
  listText:       { flex: 1, fontSize: 15, lineHeight: 24 },
  numBadge:       { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numText:        { fontSize: 11, fontWeight: '700', color: COLORS.purpleLight },
  codeBlock:      { backgroundColor: '#141414', borderRadius: 12, padding: 14, marginVertical: 8, borderWidth: 1, borderColor: '#2a2a2a' },
  codeLang:       { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace', marginBottom: 8, textTransform: 'uppercase' },
  codeText:       { fontFamily: 'monospace', fontSize: 13, color: '#e0e0e0', lineHeight: 20 },
});

// ═══════════════════════════════════════
//  MESSAGE BUBBLE
// ═══════════════════════════════════════

function GeneratedImage({ prompt }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const seed = React.useRef(Math.floor(Math.random() * 999999)).current;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&model=flux&nologo=true&enhance=true&seed=${seed}`;

  return (
    <View style={mb.genImgWrap}>
      {!loaded && !error && (
        <View style={mb.genImgLoading}>
          <ActivityIndicator color={COLORS.purpleLight} />
          <Text style={mb.genImgLoadingText}>Gerando imagem...</Text>
        </View>
      )}
      {!error && (
        <Image source={{ uri: url }} style={[mb.genImg, !loaded && { width: 0, height: 0 }]}
          resizeMode="cover" onLoad={() => setLoaded(true)} onError={() => setError(true)} />
      )}
      {error && <Text style={mb.genImgError}>❌ Não foi possível gerar a imagem.</Text>}
    </View>
  );
}

function TypingDots() {
  return (
    <View style={mb.typing}>
      {[0, 1, 2].map(i => <View key={i} style={[mb.dot, { opacity: 0.3 + i * 0.2 }]} />)}
    </View>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.content || '');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <View style={mb.userRow}>
        {message.attachments?.map((att, i) => (
          att.type === 'image'
            ? <Image key={i} source={{ uri: att.uri }} style={mb.msgImg} resizeMode="cover" />
            : <View key={i} style={mb.fileTag}><Text style={mb.fileTagText}>📎 {att.name}</Text></View>
        ))}
        {message.displayText ? (
          <View style={mb.userBubble}><Text style={mb.userText}>{message.displayText}</Text></View>
        ) : null}
      </View>
    );
  }

  const imgMatch = message.content?.match(/\[GERAR_IMAGEM:\s*(.+?)\]/i);
  const textWithoutImg = message.content?.replace(/\[GERAR_IMAGEM:\s*.+?\]/i, '').trim();

  return (
    <View style={mb.aiRow}>
      <View style={mb.avatar}><Text style={mb.avatarIcon}>⚡</Text></View>
      <View style={mb.aiContent}>
        {textWithoutImg ? <MarkdownText content={textWithoutImg} /> : null}
        {imgMatch ? <GeneratedImage prompt={imgMatch[1]} /> : null}
        {message.content && !message.isTyping ? (
          <TouchableOpacity style={mb.copyBtn} onPress={handleCopy}>
            <Text style={mb.copyBtnText}>{copied ? '✓ Copiado' : 'Copiar'}</Text>
          </TouchableOpacity>
        ) : null}
        {message.isTyping ? <TypingDots /> : null}
      </View>
    </View>
  );
}

const mb = StyleSheet.create({
  userRow:        { alignItems: 'flex-end', gap: 6, marginBottom: 4 },
  userBubble:     { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '80%' },
  userText:       { color: COLORS.text, fontSize: 15, lineHeight: 23 },
  msgImg:         { width: 220, height: 180, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  fileTag:        { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  fileTagText:    { color: COLORS.textMuted, fontSize: 13 },
  aiRow:          { flexDirection: 'row', gap: 12, marginBottom: 6, alignItems: 'flex-start' },
  avatar:         { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  avatarIcon:     { fontSize: 14 },
  aiContent:      { flex: 1, gap: 4 },
  copyBtn:        { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 },
  copyBtnText:    { fontSize: 12, color: COLORS.textMuted },
  typing:         { flexDirection: 'row', gap: 5, padding: 8 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.purpleLight },
  genImgWrap:     { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  genImgLoading:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: 'rgba(124,58,237,0.08)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.2)', borderRadius: 12 },
  genImgLoadingText:{ color: COLORS.purpleLight, fontSize: 13 },
  genImg:         { width: '100%', height: 260, borderRadius: 14 },
  genImgError:    { color: COLORS.danger, fontSize: 13 },
});

// ═══════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════

function Sidebar({ visible, chats, activeChatId, onClose, onNewChat, onSelectChat, onDeleteChat }) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={sb.overlay} onPress={onClose} />
      <View style={sb.sidebar}>
        <View style={sb.header}>
          <Text style={sb.title}>CONVERSAS</Text>
          <TouchableOpacity style={sb.closeBtn} onPress={onClose}>
            <Text style={sb.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={sb.newChatBtn} onPress={onNewChat} activeOpacity={0.7}>
          <Text style={sb.newChatIcon}>✦</Text>
          <Text style={sb.newChatText}>Novo chat</Text>
        </TouchableOpacity>
        <Text style={sb.label}>RECENTES</Text>
        <ScrollView style={sb.list} showsVerticalScrollIndicator={false}>
          {chats.length === 0 ? (
            <Text style={sb.empty}>Nenhuma conversa ainda.{'\n'}Comece um novo chat!</Text>
          ) : (
            chats.map(chat => (
              <TouchableOpacity
                key={chat.id}
                style={[sb.chatItem, chat.id === activeChatId && sb.chatItemActive]}
                onPress={() => onSelectChat(chat.id)}
                activeOpacity={0.7}
              >
                <View style={sb.chatInfo}>
                  <Text style={[sb.chatTitle, chat.id === activeChatId && sb.chatTitleActive]} numberOfLines={1}>{chat.title}</Text>
                  <Text style={sb.chatDate}>{chat.date}</Text>
                </View>
                <TouchableOpacity style={sb.deleteBtn} onPress={() => onDeleteChat(chat.id)} hitSlop={8}>
                  <Text style={sb.deleteBtnText}>🗑</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const sb = StyleSheet.create({
  overlay:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sidebar:        { position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, backgroundColor: COLORS.surface, borderRightWidth: 1, borderRightColor: COLORS.border2 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:          { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },
  closeBtn:       { width: 28, height: 28, borderWidth: 1, borderColor: COLORS.border2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:   { color: COLORS.textMuted, fontSize: 12 },
  newChatBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 12, padding: 12, backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.35)', borderRadius: 12 },
  newChatIcon:    { color: COLORS.purpleLight, fontSize: 16 },
  newChatText:    { color: COLORS.purpleLight, fontWeight: '700', fontSize: 14 },
  label:          { fontSize: 10, color: COLORS.textDim, paddingHorizontal: 16, paddingBottom: 6, letterSpacing: 0.8 },
  list:           { flex: 1, paddingHorizontal: 8 },
  empty:          { textAlign: 'center', color: COLORS.textDim, fontSize: 12, padding: 24, lineHeight: 20 },
  chatItem:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 11, borderRadius: 10, marginBottom: 2, borderWidth: 1, borderColor: 'transparent' },
  chatItemActive: { backgroundColor: 'rgba(124,58,237,0.14)', borderColor: 'rgba(124,58,237,0.3)' },
  chatInfo:       { flex: 1, minWidth: 0 },
  chatTitle:      { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  chatTitleActive:{ color: COLORS.purpleLight },
  chatDate:       { fontSize: 10, color: COLORS.textDim },
  deleteBtn:      { padding: 4 },
  deleteBtnText:  { fontSize: 14 },
});

// ═══════════════════════════════════════
//  CHAT SCREEN (App principal)
// ═══════════════════════════════════════

const QUICK_PROMPTS = [
  'Explica async/await em JS',
  'Como criar uma API REST?',
  'Melhores práticas Python',
  'O que é Big O Notation?',
];

export default function App() {
  const [chats, setChats]         = useState([]);
  const [activeChatId, setActiveId] = useState(null);
  const [history, setHistory]     = useState([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [isPro, setIsPro]         = useState(false);
  const [msgCount, setMsgCount]   = useState(0);
  const [pending, setPending]     = useState([]);
  const [sidebarOpen, setSidebar] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [c, pro, cnt] = await Promise.all([loadChats(), loadIsPro(), loadMsgCount()]);
      setIsPro(pro);
      setMsgCount(cnt);
      if (c.length > 0) { setChats(c); loadChatById(c, c[0].id); }
      else { createNewChat([]); }
    })();
  }, []);

  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

  const createNewChat = useCallback((currentChats) => {
    const chat = newChat();
    const updated = [chat, ...currentChats];
    setChats(updated); setActiveId(chat.id); setHistory([]);
    saveChats(updated);
    return chat.id;
  }, []);

  const loadChatById = (chatList, id) => {
    const chat = chatList.find(c => c.id === id);
    if (!chat) return;
    setActiveId(id); setHistory(chat.history || []);
  };

  const saveCurrent = useCallback((chatList, id, hist) => {
    const updated = chatList.map(c => {
      if (c.id !== id) return c;
      const firstUser = hist.find(m => m.role === 'user');
      const title = firstUser?.displayText?.slice(0, 40) || 'Novo chat';
      return { ...c, history: hist, title };
    });
    setChats(updated); saveChats(updated);
    return updated;
  }, []);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permissão necessária', 'Permita acesso à galeria.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, base64: true, quality: 0.7 });
    if (!result.canceled) {
      const newImgs = result.assets.slice(0, 4).map(a => ({ type: 'image', uri: a.uri, base64: a.base64, mime: a.mimeType || 'image/jpeg', name: a.fileName || 'imagem.jpg' }));
      setPending(prev => [...prev, ...newImgs].slice(0, 4));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const pickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permissão necessária', 'Permita acesso à câmera.'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!result.canceled) {
      const a = result.assets[0];
      setPending(prev => [...prev, { type: 'image', uri: a.uri, base64: a.base64, mime: a.mimeType || 'image/jpeg', name: 'foto.jpg' }].slice(0, 4));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['text/*', 'application/json', 'application/javascript'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri);
      setPending(prev => [...prev, { type: 'file', name: asset.name, content }]);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeAttachment = (i) => setPending(prev => prev.filter((_, idx) => idx !== i));

  const handleSend = async () => {
    const txt = input.trim();
    if (!txt && pending.length === 0) return;
    if (!isPro && msgCount >= FREE_CAP) {
      Alert.alert('Limite atingido', 'Você atingiu o limite de mensagens gratuitas.');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInput(''); setLoading(true);
    const atts = [...pending]; setPending([]);

    const txtLow = txt.toLowerCase();
    if (atts.length === 0 && /que horas|que hora|hora(s)? (atual|agora)|horário/.test(txtLow)) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const reply = `São **${h}:${m}** 🕐`;
      const userMsg = { role: 'user', content: txt, displayText: txt, attachments: [] };
      const assistMsg = { role: 'assistant', content: reply };
      const newHist = [...history, userMsg, assistMsg];
      setHistory(newHist);
      saveCurrent(chats, activeChatId, newHist);
      const newCount = msgCount + 1; setMsgCount(newCount); saveMsgCount(newCount);
      setLoading(false); scrollToBottom(); return;
    }

    if (atts.length === 0 && isImageRequest(txt)) {
      const imgPrompt = buildImagePrompt(txt);
      const fakeReply = `Aqui está sua imagem! 🎨\n[GERAR_IMAGEM: ${imgPrompt}]`;
      const userMsg = { role: 'user', content: txt, displayText: txt, attachments: [] };
      const assistMsg = { role: 'assistant', content: fakeReply };
      const newHist = [...history, userMsg, assistMsg];
      setHistory(newHist);
      saveCurrent(chats, activeChatId, newHist);
      const newCount = msgCount + 1; setMsgCount(newCount); saveMsgCount(newCount);
      setLoading(false); scrollToBottom(); return;
    }

    const images = atts.filter(a => a.type === 'image');
    const files  = atts.filter(a => a.type === 'file');
    const savedAtts = atts.map(a => a.type === 'image' ? { type: 'image', uri: a.uri, name: a.name } : { type: 'file', name: a.name });

    const userMsg = { role: 'user', content: txt, displayText: txt, attachments: savedAtts };
    const typingMsg = { role: 'assistant', content: '', isTyping: true };
    const histWithTyping = [...history, userMsg, typingMsg];
    setHistory(histWithTyping); scrollToBottom();

    try {
      const reply = await sendMessage({ userText: txt, images, files, history });
      const assistMsg = { role: 'assistant', content: reply };
      const newHist = [...history, userMsg, assistMsg];
      setHistory(newHist);
      saveCurrent(chats, activeChatId, newHist);
      const newCount = msgCount + 1; setMsgCount(newCount); saveMsgCount(newCount);
    } catch (e) {
      const errMsg = { role: 'assistant', content: `❌ ${e.message}` };
      setHistory([...history, userMsg, errMsg]);
    } finally {
      setLoading(false); scrollToBottom();
    }
  };

  const handleNewChat = () => { setSidebar(false); createNewChat(chats); };

  const handleSelectChat = (id) => { loadChatById(chats, id); setSidebar(false); };

  const handleDeleteChat = (id) => {
    const updated = chats.filter(c => c.id !== id);
    setChats(updated); saveChats(updated);
    if (id === activeChatId) {
      if (updated.length > 0) loadChatById(updated, updated[0].id);
      else createNewChat([]);
    }
  };

  const isWelcome = history.length === 0;

  return (
    <SafeAreaView style={cs.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <Sidebar
        visible={sidebarOpen} chats={chats} activeChatId={activeChatId}
        onClose={() => setSidebar(false)} onNewChat={handleNewChat}
        onSelectChat={handleSelectChat} onDeleteChat={handleDeleteChat}
      />

      <KeyboardAvoidingView style={cs.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>

        {/* Header */}
        <View style={cs.header}>
          <TouchableOpacity style={cs.menuBtn} onPress={() => setSidebar(true)}>
            <Text style={cs.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={cs.logoWrap}>
            <View style={cs.logoIcon}><Text style={cs.logoIconText}>⚡</Text></View>
            <Text style={cs.logoText}>Faells AI</Text>
          </View>
          <View style={cs.headerRight}>
            {isPro ? (
              <View style={cs.proBadge}><Text style={cs.proBadgeText}>⚡ PRÓ</Text></View>
            ) : (
              <View style={cs.counter}>
                <Text style={cs.counterText}><Text style={cs.counterNum}>{FREE_CAP - msgCount}</Text> restantes</Text>
              </View>
            )}
          </View>
        </View>

        {/* Chat */}
        <ScrollView ref={scrollRef} style={cs.chat} contentContainerStyle={cs.chatContent} showsVerticalScrollIndicator={false} onContentSizeChange={scrollToBottom}>
          {isWelcome && (
            <View style={cs.welcome}>
              <View style={cs.welcomeOrb}><Text style={cs.welcomeOrbIcon}>⚡</Text></View>
              <Text style={cs.welcomeTitle}>Faells AI</Text>
              <Text style={cs.welcomeSub}>Sua IA que sabe de tudo. Pergunte qualquer coisa.</Text>
              <View style={cs.chips}>
                {QUICK_PROMPTS.map((p, i) => (
                  <TouchableOpacity key={i} style={cs.chip} onPress={() => setInput(p)} activeOpacity={0.7}>
                    <Text style={cs.chipText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {history.map((msg, i) => <MessageBubble key={i} message={msg} />)}
        </ScrollView>

        {/* Previews */}
        {pending.length > 0 && (
          <View style={cs.previews}>
            {pending.map((att, i) => (
              <View key={i} style={cs.prevChip}>
                {att.type === 'image' ? <Image source={{ uri: att.uri }} style={cs.prevImg} /> : <Text style={cs.prevFileIcon}>📎</Text>}
                <Text style={cs.prevName} numberOfLines={1}>{att.name}</Text>
                <TouchableOpacity onPress={() => removeAttachment(i)} hitSlop={8}><Text style={cs.prevRm}>✕</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Input */}
        <View style={cs.inputWrap}>
          <View style={cs.inputBox}>
            <TextInput
              style={cs.textarea} value={input} onChangeText={setInput}
              placeholder="Mensagem para Faells AI" placeholderTextColor="#555"
              multiline maxLength={4000} returnKeyType="default"
            />
            <View style={cs.inputBtns}>
              <View style={cs.inputBtnsLeft}>
                <TouchableOpacity style={cs.ibtn} onPress={pickFile} hitSlop={8}><Text style={cs.ibtnIcon}>📎</Text></TouchableOpacity>
                <TouchableOpacity style={cs.ibtn} onPress={pickImage} hitSlop={8}><Text style={cs.ibtnIcon}>🖼️</Text></TouchableOpacity>
                <TouchableOpacity style={cs.ibtn} onPress={pickCamera} hitSlop={8}><Text style={cs.ibtnIcon}>📷</Text></TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[cs.sendBtn, (loading || (!input.trim() && pending.length === 0)) && cs.sendBtnDisabled]}
                onPress={handleSend} disabled={loading || (!input.trim() && pending.length === 0)}
              >
                {loading ? <ActivityIndicator size="small" color="#000" /> : <Text style={cs.sendIcon}>↑</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: COLORS.bg },
  flex:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg },
  menuBtn:        { width: 36, height: 36, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuIcon:       { color: COLORS.textMuted, fontSize: 16 },
  logoWrap:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoIcon:       { width: 32, height: 32, backgroundColor: COLORS.purple, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoIconText:   { fontSize: 16 },
  logoText:       { fontSize: 17, fontWeight: '800', color: COLORS.purpleLight },
  headerRight:    { minWidth: 80, alignItems: 'flex-end' },
  proBadge:       { backgroundColor: COLORS.purple, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  proBadgeText:   { color: '#fff', fontWeight: '800', fontSize: 11 },
  counter:        { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  counterText:    { fontSize: 11, color: COLORS.textMuted },
  counterNum:     { color: COLORS.neon, fontWeight: '700' },
  chat:           { flex: 1 },
  chatContent:    { padding: 16, gap: 8, paddingBottom: 20 },
  welcome:        { alignItems: 'center', paddingVertical: 40, gap: 14 },
  welcomeOrb:     { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(124,58,237,0.2)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center' },
  welcomeOrbIcon: { fontSize: 32 },
  welcomeTitle:   { fontSize: 26, fontWeight: '800', color: COLORS.purpleLight },
  welcomeSub:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border2, borderRadius: 20 },
  chipText:       { fontSize: 12, color: COLORS.textMuted },
  previews:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  prevChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, maxWidth: 160 },
  prevImg:        { width: 24, height: 24, borderRadius: 5 },
  prevFileIcon:   { fontSize: 14 },
  prevName:       { flex: 1, fontSize: 11, color: COLORS.textMuted },
  prevRm:         { fontSize: 11, color: COLORS.textMuted },
  inputWrap:      { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.bg },
  inputBox:       { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border2, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 8 },
  textarea:       { color: COLORS.text, fontSize: 15, maxHeight: 160, lineHeight: 22 },
  inputBtns:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputBtnsLeft:  { flexDirection: 'row', gap: 4 },
  ibtn:           { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  ibtnIcon:       { fontSize: 18 },
  sendBtn:        { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:{ opacity: 0.3 },
  sendIcon:       { fontSize: 18, color: '#000', fontWeight: '700' },
});
