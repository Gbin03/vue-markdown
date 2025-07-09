import {unreachable} from 'devlop'
import {toJsxRuntime} from 'hast-util-to-jsx-runtime'
import {urlAttributes} from 'html-url-attributes'
import {defineComponent, ref, watch, h} from 'vue'
import {Fragment, jsx, jsxs} from 'vue/jsx-runtime'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {unified} from 'unified'
import {visit} from 'unist-util-visit'
import {VFile} from 'vfile'

const emptyPlugins = []
const emptyRemarkRehypeOptions = {allowDangerousHtml: true}
const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i

export const Markdown = defineComponent({
  props: [
    'text',
    'allowedElements',
    'allowElement',
    'components',
    'disallowedElements',
    'skipHtml',
    'unwrapDisallowed',
    'urlTransform',
    'rehypePlugins',
    'remarkPlugins',
    'remarkRehypeOptions'
  ],
  inheritAttrs: false,
  setup(props) {
    const processor = ref(createProcessor(props))
    const treeRef = ref(null)
    function processMarkdown() {
      const file = createFile(props)
      if (processor.value) {
        treeRef.value = processor.value.runSync(
          processor.value.parse(file),
          file
        )
      }
    }

    watch(
      [
        () => props.rehypePlugins,
        () => props.remarkPlugins,
        () => props.remarkRehypeOptions
      ],
      () => {
        processor.value = createProcessor(props)
      }
    )

    watch([processor, () => props.text], processMarkdown, {
      immediate: true
    })

    return () => {
      const vnode = post(treeRef.value, props)
      return vnode
      //return h('div', {class: 'vue-markdown-preview'}, vnode); //or add wrapper
    }
  }
})

export const MarkdownHooks = defineComponent({
  props: [
    'text',
    'fallback',
    'allowedElements',
    'allowElement',
    'components',
    'disallowedElements',
    'skipHtml',
    'unwrapDisallowed',
    'urlTransform',
    'rehypePlugins',
    'remarkPlugins',
    'remarkRehypeOptions'
  ],
  inheritAttrs: false,
  setup(props) {
    const errorRef = ref(null)
    const treeRef = ref(null)
    const processor = ref(createProcessor(props))

    function processMarkdown() {
      const file = createFile(props)
      if (processor.value) {
        processor.value.run(
          processor.value.parse(file),
          file,
          function (error, tree) {
            errorRef.value = error
            treeRef.value = tree
          }
        )
      }
    }

    watch(
      [
        () => props.rehypePlugins,
        () => props.remarkPlugins,
        () => props.remarkRehypeOptions
      ],
      () => {
        processor.value = createProcessor(props)
      }
    )

    watch([processor, () => props.text], processMarkdown, {
      immediate: true
    })

    return () => {
      if (errorRef.value) {
        throw errorRef.value
      }

      return treeRef.value
        ? post(treeRef.value, props)
        : // h('div', {class: 'vue-markdown-preview'}, post(treeRef.value, props)) //or add wrapper
          props.fallback || h(Fragment)
    }
  }
})

function createProcessor(options) {
  const rehypePlugins = options.rehypePlugins || emptyPlugins
  const remarkPlugins = options.remarkPlugins || emptyPlugins
  const remarkRehypeOptions = options.remarkRehypeOptions
    ? {...options.remarkRehypeOptions, ...emptyRemarkRehypeOptions}
    : emptyRemarkRehypeOptions

  const processor = unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, remarkRehypeOptions)
    .use(rehypePlugins)

  return processor
}

function createFile(options) {
  const text = options.text || ''
  const file = new VFile()

  if (typeof text === 'string') {
    file.value = text
  } else {
    unreachable(
      'Unexpected value `' + text + '` for `children` prop, expected `string`'
    )
  }

  return file
}

function post(tree, options) {
  const allowedElements = options.allowedElements
  const allowElement = options.allowElement
  const components = options.components
  const disallowedElements = options.disallowedElements
  const skipHtml = options.skipHtml
  const unwrapDisallowed = options.unwrapDisallowed
  const urlTransform = options.urlTransform || defaultUrlTransform

  if (allowedElements && disallowedElements) {
    unreachable(
      'Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other'
    )
  }

  visit(tree, transform)

  return toJsxRuntime(tree, {
    Fragment,
    components,
    ignoreInvalidStyle: true,
    jsx,
    jsxs,
    elementAttributeNameCase: 'html',
    passKeys: true,
    passNode: true
  })

  function transform(node, index, parent) {
    if (node.type === 'raw' && parent && typeof index === 'number') {
      if (skipHtml) {
        parent.children.splice(index, 1)
      } else {
        parent.children[index] = {type: 'text', value: node.value}
      }

      return index
    }

    if (node.type === 'element') {
      let key

      for (key in urlAttributes) {
        if (
          Object.hasOwn(urlAttributes, key) &&
          Object.hasOwn(node.properties, key)
        ) {
          const value = node.properties[key]
          const test = urlAttributes[key]
          if (test === null || test.includes(node.tagName)) {
            node.properties[key] = urlTransform(String(value || ''), key, node)
          }
        }
      }
    }

    if (node.type === 'element') {
      let remove = allowedElements
        ? !allowedElements.includes(node.tagName)
        : disallowedElements
          ? disallowedElements.includes(node.tagName)
          : false

      if (!remove && allowElement && typeof index === 'number') {
        remove = !allowElement(node, index, parent)
      }

      if (remove && parent && typeof index === 'number') {
        if (unwrapDisallowed && node.children) {
          parent.children.splice(index, 1, ...node.children)
        } else {
          parent.children.splice(index, 1)
        }

        return index
      }
    }
  }
}

/**
 * Make a URL safe.
 *
 * This follows how GitHub works.
 * It allows the protocols `http`, `https`, `irc`, `ircs`, `mailto`, and `xmpp`,
 * and URLs relative to the current protocol (such as `/something`).
 *
 * @satisfies {UrlTransform}
 * @param {string} value
 *   URL.
 * @returns {string}
 *   Safe URL.
 */
export function defaultUrlTransform(value) {
  // Same as:
  // <https://github.com/micromark/micromark/blob/929275e/packages/micromark-util-sanitize-uri/dev/index.js#L34>
  // But without the `encode` part.
  const colon = value.indexOf(':')
  const questionMark = value.indexOf('?')
  const numberSign = value.indexOf('#')
  const slash = value.indexOf('/')

  if (
    // If there is no protocol, it’s relative.
    colon === -1 ||
    // If the first colon is after a `?`, `#`, or `/`, it’s not a protocol.
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    // It is a protocol, it should be allowed.
    safeProtocol.test(value.slice(0, colon))
  ) {
    return value
  }

  return ''
}
