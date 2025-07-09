import assert from 'node:assert/strict'
import test from 'node:test'
import 'global-jsdom/register'
import {render, waitFor} from '@testing-library/vue'

import {renderToString} from '@vue/server-renderer'
import {mount} from '@vue/test-utils'

import Markdown, {MarkdownHooks} from 'vue-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeStarryNight from 'rehype-starry-night'
import remarkGfm from 'remark-gfm'
import remarkToc from 'remark-toc'
import {visit} from 'unist-util-visit'
import {createSSRApp, h, isVNode} from 'vue'

function getVNodeType(vnode) {
  if (!isVNode(vnode)) return false

  if (typeof vnode.type === 'symbol') {
    const symbolDesc = vnode.type.description
    if (symbolDesc === 'v-txt') return 'txt'
    if (symbolDesc === 'Fragment') return 'fragment'
    if (symbolDesc === 'Comment') return 'comment'
  }

  return false
}

test('vue-remark-markdown (core)', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('react-markdown')).sort(), [
      'MarkdownHooks',
      'default',
      'defaultUrlTransform'
    ])
  })
})

test('Markdown', async function (t) {
  await t.test('01-should work', function () {
    const wrapper = mount(Markdown, {
      props: {text: 'a'}
    })
    assert.equal(wrapper.html(), '<p>a</p>')
  })

  await t.test('02-should throw w/ `source`', function () {
    const wrapper = mount(Markdown, {
      props: {source: 'a'}
    })
    assert.equal(wrapper.html(), '')
  })

  await t.test('03-should throw w/ non-string children (number)', function () {
    assert.throws(function () {
      const wrapper = mount(Markdown, {
        props: {text: 1}
      })
      wrapper.html()
    }, /Unexpected value `1` for `children` prop, expected `string`/)
  })

  await t.test('04-should throw w/ non-string children (boolean)', function () {
    assert.throws(function () {
      const wrapper = mount(Markdown, {
        props: {text: true}
      })
      wrapper.html()
    }, /Unexpected value `true` for `children` prop, expected `string`/)
  })

  await t.test('05-should support `null` as children', function () {
    const wrapper = mount(Markdown, {
      props: {text: null}
    })
    assert.equal(wrapper.html(), '')
  })

  await t.test('06-should support `undefined` as children', function () {
    const wrapper = mount(Markdown, {
      props: {text: undefined}
    })
    assert.equal(wrapper.html(), '')
  })

  await t.test('07-should warn w/ `allowDangerousHtml`', function () {
    const wrapper = mount(Markdown, {
      props: {allowDangerousHtml: true}
    })
    assert.equal(wrapper.html(), '')
  })

  await t.test('08-should support a block quote', async function () {
    const app = createSSRApp({
      render: () => h(Markdown, {text: '> a'})
    })
    const html = await renderToString(app)
    const cleanHtml = html.replace(/<!--\[-->/g, '').replace(/<!--\]-->/g, '')

    assert.equal(cleanHtml, '<blockquote>\n<p>a</p>\n</blockquote>')
  })

  await t.test('09-should support a delete (GFM)', function () {
    const wrapper = mount(Markdown, {
      props: {text: '~a~', remarkPlugins: [remarkGfm]}
    })

    assert.equal(wrapper.html(), '<p><del>a</del></p>')
  })

  await t.test('10-should support a footnote (GFM)', async function () {
    const app = createSSRApp({
      render: () =>
        h(Markdown, {text: 'a[^x]\n\n[^x]: y', remarkPlugins: [remarkGfm]})
    })
    const html = await renderToString(app)
    const cleanHtml = html.replace(/<!--\[-->/g, '').replace(/<!--\]-->/g, '')
    assert.equal(
      cleanHtml,
      `<p>a<sup><a href="#user-content-fn-x" id="user-content-fnref-x" data-footnote-ref="true" aria-describedby="footnote-label">1</a></sup></p>
<section data-footnotes="true" class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>
<ol>
<li id="user-content-fn-x">
<p>y <a href="#user-content-fnref-x" data-footnote-backref aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>
</li>
</ol>
</section>`
    )
  })

  await t.test('11-should support an html (default)', function () {
    const wrapper = mount(Markdown, {
      props: {text: '<i>a</i>'}
    })

    assert.equal(wrapper.html(), '<p>&lt;i&gt;a&lt;/i&gt;</p>')
  })

  await t.test('12-should support an html (w/ `rehype-raw`)', function () {
    const wrapper = mount(Markdown, {
      props: {text: '<i>a</i>', rehypePlugins: [rehypeRaw]}
    })

    assert.equal(wrapper.html(), '<p><i>a</i></p>')
  })

  await t.test('13-should support an image', async function () {
    const wrapper = mount(Markdown, {
      props: {text: '![a](b)'}
    })

    assert.equal(wrapper.html(), '<p><img src="b" alt="a"></p>')
  })

  await t.test('14-should support an image w/ a title', function () {
    const wrapper = mount(Markdown, {
      props: {text: '![a](b (c))'}
    })

    assert.equal(wrapper.html(), '<p><img src="b" alt="a" title="c"></p>')
  })

  await t.test(
    '15-should support an image reference / definition',
    function () {
      const wrapper = mount(Markdown, {
        props: {text: '![a]\n\n[a]: b'}
      })

      assert.equal(wrapper.html(), '<p><img src="b" alt="a"></p>')
    }
  )

  await t.test('16-should support a URL w/ uppercase protocol', function () {
    const wrapper = mount(Markdown, {
      props: {text: '[](HTTPS://A.COM)'}
    })

    assert.equal(wrapper.html(), '<p><a href="HTTPS://A.COM"></a></p>')
  })

  await t.test(
    '17-should support `urlTransform` (`href` on `a`)',
    async function () {
      const wrapper = mount(Markdown, {
        props: {
          text: "[a](https://b.com 'c')",
          urlTransform: function (url, key, node) {
            assert.equal(key, 'href')
            assert.equal(node.tagName, 'a')
            return ''
          }
        }
      })

      await wrapper.vm.$nextTick()

      assert.equal(wrapper.html(), '<p><a href="" title="c">a</a></p>')
    }
  )

  await t.test('18-should support aria properties', async function () {
    const app = createSSRApp({
      render: () => h(Markdown, {text: 'c', rehypePlugins: [plugin]})
    })
    const html = await renderToString(app)
    const cleanHtml = html.replace(/<!--\[-->/g, '').replace(/<!--\]-->/g, '')

    assert.equal(
      cleanHtml,
      '<input id="a" aria-describedby="b" required><p>c</p>'
    )

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        tree.children.unshift({
          type: 'element',
          tagName: 'input',
          properties: {id: 'a', ariaDescribedBy: 'b', required: true},
          children: []
        })
      }
    }
  })

  await t.test('19-should support SVG elements', async function () {
    const app = createSSRApp({
      render: () => h(Markdown, {text: 'a', rehypePlugins: [plugin]})
    })
    const html = await renderToString(app)
    const cleanHtml = html.replace(/<!--\[-->/g, '').replace(/<!--\]-->/g, '')

    assert.equal(
      cleanHtml,
      '<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg"><title>SVG `&lt;circle&gt;` element</title><circle cx="120" cy="120" r="100"></circle><path stroke-miterlimit="-1"></path></svg><p>a</p>'
    )

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        tree.children.unshift({
          type: 'element',
          tagName: 'svg',
          properties: {
            viewBox: '0 0 500 500',
            xmlns: 'http://www.w3.org/2000/svg'
          },
          children: [
            {
              type: 'element',
              tagName: 'title',
              properties: {},
              children: [{type: 'text', value: 'SVG `<circle>` element'}]
            },
            {
              type: 'element',
              tagName: 'circle',
              properties: {cx: 120, cy: 120, r: 100},
              children: []
            },
            // `strokeMiterLimit` in hast, `strokeMiterlimit` in React.
            {
              type: 'element',
              tagName: 'path',
              properties: {strokeMiterLimit: -1},
              children: []
            }
          ]
        })
      }
    }
  })

  await t.test('20-should support an html (w/ `rehype-raw`)', function () {
    const wrapper = mount(Markdown, {
      props: {text: '<i>a</i>', rehypePlugins: [rehypeRaw]}
    })
    assert.equal(wrapper.html(), '<p><i>a</i></p>')
  })

  await t.test('21-should support table cells w/ style', async function () {
    const app = createSSRApp({
      render: () =>
        h(Markdown, {
          text: '| a  |\n| :- |',
          remarkPlugins: [remarkGfm],
          rehypePlugins: [plugin]
        })
    })
    const html = await renderToString(app)
    const cleanHtml = html.replace(/<!--\[-->/g, '').replace(/<!--\]-->/g, '')

    assert.equal(
      cleanHtml,
      '<table><thead><tr><th style="color:red;text-align:left;">a</th></tr></thead></table>'
    )

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        visit(tree, 'element', function (node) {
          if (node.tagName === 'th') {
            node.properties = {...node.properties, style: 'color: red'}
          }
        })
      }
    }
  })

  await t.test('22-should support plugins (`remark-toc`)', async function () {
    const app = createSSRApp({
      render: () =>
        h(Markdown, {
          text: '# a\n## Contents\n## b\n### c\n## d',
          remarkPlugins: [remarkToc]
        })
    })
    const html = await renderToString(app)
    const cleanHtml = html.replace(/<!--\[-->/g, '').replace(/<!--\]-->/g, '')

    assert.equal(
      cleanHtml,
      `<h1>a</h1>
<h2>Contents</h2>
<ul>
<li><a href="#b">b</a>
<ul>
<li><a href="#c">c</a></li>
</ul>
</li>
<li><a href="#d">d</a></li>
</ul>
<h2>b</h2>
<h3>c</h3>
<h2>d</h2>`
    )
  })

  await t.test('23-should support `components`', function () {
    const wrapper = mount(Markdown, {
      props: {text: '# a', components: {h1: 'h2'}}
    })

    assert.equal(wrapper.html(), '<h2>a</h2>')
  })

  await t.test('24-should support `components` as functions', function () {
    const wrapper = mount(Markdown, {
      props: {
        text: 'a',
        components: {
          p: {
            props: ['node'],
            setup(props, {slots, attrs}) {
              const vnodeType = getVNodeType(slots.default()?.[0])
              assert.equal(vnodeType, 'txt')
              assert.deepEqual(slots.default()?.[0]?.children, 'a')
              return () => h('div', attrs, slots.default()?.[0]?.children)
            }
          }
        }
      }
    })

    assert.equal(wrapper.html(), '<div>a</div>')
  })
})

test('MarkdownHooks', async function (t) {
  await t.test('01-should support `MarkdownHooks`', async function () {
    const plugin = deferPlugin()
    const result = render(MarkdownHooks, {
      props: {text: 'a', rehypePlugins: [plugin.plugin]}
    })
    assert.equal(result.container.innerHTML, '')

    plugin.resolve()

    await waitFor(function () {
      assert.notEqual(result.container.innerHTML, '')
    })

    assert.equal(result.container.innerHTML, '<p>a</p>')
  })

  await t.test(
    '02-should support async plugins w/ `MarkdownHooks` (`rehype-starry-night`)',
    async function () {
      const plugin = deferPlugin()
      const result = render(MarkdownHooks, {
        props: {
          text: '```js\nconsole.log(3.14)',
          rehypePlugins: [plugin.plugin, rehypeStarryNight]
        }
      })

      assert.equal(result.container.innerHTML, '')

      plugin.resolve()

      await waitFor(function () {
        assert.notEqual(result.container.innerHTML, '')
      })

      assert.equal(
        result.container.innerHTML,
        '<pre><code class="language-js"><span class="pl-en">console</span>.<span class="pl-c1">log</span>(<span class="pl-c1">3.14</span>)\n</code></pre>'
      )
    }
  )

  await t.test('03-should support `fallback`', async function () {
    const plugin = deferPlugin()
    const result = render(MarkdownHooks, {
      props: {text: 'a', fallback: 'Loading', rehypePlugins: [plugin.plugin]}
    })

    assert.equal(result.container.innerHTML, 'Loading')

    plugin.resolve()

    await waitFor(function () {
      assert.notEqual(result.container.innerHTML, 'Loading')
    })

    assert.equal(result.container.innerHTML, '<p>a</p>')
  })

  await t.test('04-should support rerenders', async function () {
    const pluginA = deferPlugin()
    const pluginB = deferPlugin()

    const result = render(MarkdownHooks, {
      props: {text: 'a', rehypePlugins: [pluginA.plugin]}
    })

    assert.equal(result.container.innerHTML, '')

    result.rerender({text: 'b', rehypePlugins: [pluginB.plugin]})

    assert.equal(result.container.innerHTML, '')

    pluginA.resolve()
    pluginB.resolve()

    await waitFor(function () {
      assert.notEqual(result.container.innerHTML, '')
    })

    assert.equal(result.container.innerHTML, '<p>b</p>')
  })
})

function deferPlugin() {
  /** @type {(error: Error) => void} */
  let hoistedReject
  /** @type {() => void} */
  let hoistedResolve
  /** @type {Promise<void>} */
  const promise = new Promise(function (resolve, reject) {
    hoistedResolve = resolve
    hoistedReject = reject
  })

  return {
    plugin() {
      return function () {
        return promise
      }
    },
    reject(error) {
      hoistedReject(error)
    },
    resolve() {
      hoistedResolve()
    }
  }
}
