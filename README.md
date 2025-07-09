<!--
  Notes for maintaining this document:

  * update the version of the link for `commonmark-html` once in a while
-->

# vue-markdown

Vue component to render markdown.

## Feature highlights

* [x] **[safe][section-security] by default**
  (no `dangerouslySetInnerHTML` or XSS attacks)
* [x] **[components][section-components]**
  (pass your own component to use instead of `<h2>` for `## hi`)
* [x] **[plugins][section-plugins]**
  (many plugins you can pick and choose from)
* [x] **[compliant][section-syntax]**
  (100% to CommonMark, 100% to GFM with a plugin)

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`Markdown`](#markdown)
  * [`MarkdownHooks`](#markdownhooks)
  * [`defaultUrlTransform(url)`](#defaulturltransformurl)
  * [`AllowElement`](#allowelement)
  * [`Components`](#components)
  * [`ExtraProps`](#extraprops)
  * [`HooksOptions`](#hooksoptions)
  * [`Options`](#options)
  * [`UrlTransform`](#urltransform)
* [Examples](#examples)
  * [Use a plugin](#use-a-plugin)
  * [Use a plugin with options](#use-a-plugin-with-options)
  * [Use custom components (syntax highlight)](#use-custom-components-syntax-highlight)
  * [Use remark and rehype plugins (math)](#use-remark-and-rehype-plugins-math)
* [Plugins](#plugins)
* [Syntax](#syntax)
* [Compatibility](#compatibility)
* [Architecture](#architecture)
* [Appendix A: HTML in markdown](#appendix-a-html-in-markdown)
* [Appendix B: Components](#appendix-b-components)
* [Appendix C: line endings in markdown (and JSX)](#appendix-c-line-endings-in-markdown-and-jsx)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a [Vue][] component that can be given a string of markdown
that it’ll safely render to Vue elements.
You can pass plugins to change how markdown is transformed and pass components
that will be used instead of normal HTML elements.

* to learn markdown, see this [cheatsheet and tutorial][commonmark-help]

## When should I use this?

There are other ways to use markdown in Vue out there so why use this one?
The three main reasons are that they often rely on `dangerouslySetInnerHTML`,
have bugs with how they handle markdown, or don’t let you swap elements for
components.
`vue-markdown` builds a virtual DOM, so Vue only replaces what changed,
from a syntax tree.
That’s supported because we use [unified][github-unified],
specifically [remark][github-remark] for markdown and [rehype][github-rehype]
for HTML,
which are popular tools to transform content with plugins.

This package focusses on making it easy for beginners to safely use markdown in
Vue.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][npm-install]:

```sh
npm install @ghbsom/vue-markdown
```

## Use

A basic hello world:

```vue
<template>
  <Markdown :text="markdown" />
</template>

<script setup>
  import {ref} from 'vue';
  import Markdown from '@ghbsom/vue-markdown'
  const markdown = ref('# Hi, *Pluto*!');
</script>
```

<details>
<summary>Show equivalent JSX</summary>

```js
<h1>
  Hi, <em>Pluto</em>!
</h1>
```

</details>

Here is an example that shows how to use a plugin
([`remark-gfm`][github-remark-gfm],
which adds support for footnotes, strikethrough, tables, tasklists and
URLs directly):

```vue
<template>
  <Markdown :text="markdown" :remarkPlugins="[remarkGfm]"/>
</template>

<script setup>
  import {ref} from 'vue';
  import remarkGfm from 'remark-gfm'
  import Markdown from '@ghbsom/vue-markdown'
  const markdown = ref('Just a link: www.nasa.gov.')
</script>
```

<details>
<summary>Show equivalent JSX</summary>

```js
<p>
  Just a link: <a href="http://www.nasa.gov">www.nasa.gov</a>.
</p>
```

</details>

## API

This package exports the identifiers
[`MarkdownHooks`][api-markdown-hooks],
and
[`defaultUrlTransform`][api-default-url-transform].
The default export is [`Markdown`][api-markdown].

### `Markdown`

Component to render markdown.

This is a synchronous component.
When using async plugins,
see [`MarkdownHooks`][api-markdown-hooks].

###### Parameters

* `options` ([`Options`][api-options])
  — props

###### Returns

Vue element

### `MarkdownHooks`

Component to render markdown with support for async plugins through hooks.

This Component run on the client and do not immediately render something.

###### Parameters

* `options` ([`Options`][api-options])
  — props

###### Returns

Vue node

### `defaultUrlTransform(url)`

Make a URL safe.

This follows how GitHub works.
It allows the protocols `http`, `https`, `irc`, `ircs`, `mailto`, and `xmpp`,
and URLs relative to the current protocol (such as `/something`).

###### Parameters

* `url` (`string`)
  — URL

###### Returns

Safe URL (`string`).

## Examples

### Use a plugin

This example shows how to use a remark plugin.
In this case, [`remark-gfm`][github-remark-gfm],
which adds support for strikethrough, tables, tasklists and URLs directly:

```vue
<template>
  <Markdown :text="markdown" :remarkPlugins="[remarkGfm]"/>
</template>

<script setup>
  import {ref} from 'vue';
  import remarkGfm from 'remark-gfm'
  import Markdown from '@ghbsom/vue-markdown'
  const markdown = ref(`A paragraph with *emphasis* and **strong importance**.

> A block quote with ~strikethrough~ and a URL: https://cn.vuejs.org.

* Lists
* [ ] todo
* [x] done

A table:

| a | b |
| - | - |
`)
</script>
```

<details>
<summary>Show equivalent JSX</summary>

```js
<>
  <p>
    A paragraph with <em>emphasis</em> and <strong>strong importance</strong>.
  </p>
  <blockquote>
    <p>
      A block quote with <del>strikethrough</del> and a URL:{' '}
      <a href="https://cn.vuejs.org">https://cn.vuejs.org</a>.
    </p>
  </blockquote>
  <ul className="contains-task-list">
    <li>Lists</li>
    <li className="task-list-item">
      <input type="checkbox" disabled /> todo
    </li>
    <li className="task-list-item">
      <input type="checkbox" disabled checked /> done
    </li>
  </ul>
  <p>A table:</p>
  <table>
    <thead>
      <tr>
        <th>a</th>
        <th>b</th>
      </tr>
    </thead>
  </table>
</>
```

</details>

### Use a plugin with options

This example shows how to use a plugin and give it options.
To do that, use an array with the plugin at the first place, and the options
second.
[`remark-gfm`][github-remark-gfm] has an option to allow only double tildes for
strikethrough:

```vue
<template>
  <Markdown :text="markdown" :remarkPlugins="[[remarkGfm, {singleTilde: false}]]"/>
</template>

<script setup>
  import {ref} from 'vue';
  import remarkGfm from 'remark-gfm'
  import Markdown from '@ghbsom/vue-markdown'
  const markdown = ref('This ~is not~ strikethrough, but ~~this is~~!')
</script>
```

<details>
<summary>Show equivalent JSX</summary>

```js
<p>
  This ~is not~ strikethrough, but <del>this is</del>!
</p>
```

</details>

### Use remark and rehype plugins (math)

This example shows how a syntax extension
(through [`remark-math`][github-remark-math])
is used to support math in markdown, and a transform plugin
([`rehype-katex`][github-rehype-katex]) to render that math.

```vue
<template>
  <Markdown :text="markdown" :remarkPlugins="[remarkMath]" :rehypePlugins="[rehypeKatex]"/>
</template>

<script setup>
  import {ref} from 'vue';
  import rehypeKatex from 'rehype-katex'
  import remarkMath from 'remark-math'
  import 'katex/dist/katex.min.css' // `rehype-katex` does not import the CSS for you
  import Markdown from '@ghbsom/vue-markdown'
  const markdown = ref('The lift coefficient ($C_L$) is a dimensionless coefficient.')
</script>
```

<details>
<summary>Show equivalent JSX</summary>

```js
<p>
  The lift coefficient (
  <span className="katex">
    <span className="katex-mathml">
      <math xmlns="http://www.w3.org/1998/Math/MathML">{/* … */}</math>
    </span>
    <span className="katex-html" aria-hidden="true">
      {/* … */}
    </span>
  </span>
  ) is a dimensionless coefficient.
</p>
```

</details>

## Plugins

We use [unified][github-unified],
specifically [remark][github-remark] for markdown and
[rehype][github-rehype] for HTML,
which are tools to transform content with plugins.
Here are three good ways to find plugins:

* [`awesome-remark`][github-awesome-remark] and
  [`awesome-rehype`][github-awesome-rehype]
  — selection of the most awesome projects
* [List of remark plugins][github-remark-plugins] and
  [list of rehype plugins][github-rehype-plugins]
  — list of all plugins
* [`remark-plugin`][github-topic-remark-plugin] and
  [`rehype-plugin`][github-topic-rehype-plugin] topics
  — any tagged repo on GitHub

## Syntax

`vue-markdown` follows CommonMark, which standardizes the differences between
markdown implementations, by default.
Some syntax extensions are supported through plugins.

We use [`micromark`][github-micromark] under the hood for our parsing.
See its documentation for more information on markdown, CommonMark, and
extensions.

## Architecture

<pre><code>                                                           vue-markdown
         +----------------------------------------------------------------------------------------------------------------+
         |                                                                                                                |
         |  +----------+        +----------------+        +---------------+       +----------------+       +------------+ |
         |  |          |        |                |        |               |       |                |       |            | |
<a href="https://commonmark.org">markdown</a>-+->+  <a href="https://github.com/remarkjs/remark">remark</a>  +-<a href="https://github.com/syntax-tree/mdast">mdast</a>->+ <a href="https://github.com/remarkjs/remark/blob/main/doc/plugins.md">remark plugins</a> +-<a href="https://github.com/syntax-tree/mdast">mdast</a>->+ <a href="https://github.com/remarkjs/remark-rehype">remark-rehype</a> +-<a href="https://github.com/syntax-tree/hast">hast</a>->+ <a href="https://github.com/rehypejs/rehype/blob/main/doc/plugins.md">rehype plugins</a> +-<a href="https://github.com/syntax-tree/hast">hast</a>->+ <a href="#appendix-b-components">components</a> +-+->vue elements
         |  |          |        |                |        |               |       |                |       |            | |
         |  +----------+        +----------------+        +---------------+       +----------------+       +------------+ |
         |                                                                                                                |
         +----------------------------------------------------------------------------------------------------------------+
</code></pre>

To understand what this project does, it’s important to first understand what
unified does: please read through the [`unifiedjs/unified`][github-unified]
readme
(the part until you hit the API section is required reading).

`vue-markdown` is a unified pipeline — wrapped so that most folks don’t need
to directly interact with unified.
The processor goes through these steps:

* parse markdown to mdast (markdown syntax tree)
* transform through remark (markdown ecosystem)
* transform mdast to hast (HTML syntax tree)
* transform through rehype (HTML ecosystem)
* render hast to Vue with components

## Appendix A: HTML in markdown

`vue-markdown` typically escapes HTML (or ignores it, with `skipHtml`)
because it is dangerous and defeats the purpose of this library.

However, if you are in a trusted environment (you trust the markdown), and
can spare the bundle size (±60kb minzipped), then you can use
[`rehype-raw`][github-rehype-raw]:

```vue
<template>
  <Markdown :text="markdown" :rehypePlugins="[rehypeRaw]"/>
</template>

<script setup>
  import {ref} from 'vue';
  import rehypeRaw from 'rehype-raw'
  import 'katex/dist/katex.min.css' // `rehype-katex` does not import the CSS for you
  import Markdown from '@ghbsom/vue-markdown'
  const markdown = ref(`<div class="note">

Some *emphasis* and <strong>strong</strong>!

</div>`)
</script>
```

<details>
<summary>Show equivalent JSX</summary>

```js
<div className="note">
  <p>
    Some <em>emphasis</em> and <strong>strong</strong>!
  </p>
</div>
```

</details>

**Note**: HTML in markdown is still bound by how [HTML works in
CommonMark][commonmark-html].
Make sure to use blank lines around block-level HTML that again contains
markdown!

## Appendix B: Components

You can also change the things that come from markdown:

```vue
<Markdown
  components={{
    // Map `h1` (`# heading`) to use `h2`s.
    h1: 'h2',
    // Rewrite `em`s (`*like so*`) to `i` with a red foreground color.
    em: {
      props: ['node'],
      setup(props, {slots, attrs}) {
        return () => h('i', {style:{color: 'red'},...attrs}, slots.default?.())
      }
    }
  }}
/>
```

The keys in components are HTML equivalents for the things you write with
markdown (such as `h1` for `# heading`).
Normally, in markdown, those are: `a`, `blockquote`, `br`, `code`, `em`, `h1`,
`h2`, `h3`, `h4`, `h5`, `h6`, `hr`, `img`, `li`, `ol`, `p`, `pre`, `strong`, and
`ul`.
With [`remark-gfm`][github-remark-gfm],
you can also use `del`, `input`, `table`, `tbody`, `td`, `th`, `thead`, and `tr`.
Other remark or rehype plugins that add support for new constructs will also
work with `vue-markdown`.

The props that are passed are what you probably would expect: an `a` (link) will
get `href` (and `title`) props, and `img` (image) an `src`, `alt` and `title`,
etc.

Every component will receive a `node`.
This is the original [`Element` from `hast`][github-hast-element] element being
turned into a Vue element.

## Security

Use of `vue-markdown` is secure by default.
Overwriting `urlTransform` to something insecure will open you up to XSS
vectors.
Furthermore, the `remarkPlugins`, `rehypePlugins`, and `components` you use may
be insecure.

To make sure the content is completely safe, even after what plugins do,
use [`rehype-sanitize`][github-rehype-sanitize].
It lets you define your own schema of what is and isn’t allowed.

## Related

* [`react-markdown`][github-react-markdown]
  — equivalent react markdown component
* [`MDX`][github-mdx]
  — JSX *in* markdown
* [`remark-gfm`][github-remark-gfm]
  — add support for GitHub flavored markdown support

## License

[MIT][file-license] © [Espen Hovlandsdal][author]

[api-allow-element]: #allowelement

[api-components]: #components

[api-default-url-transform]: #defaulturltransformurl

[api-extra-props]: #extraprops

[api-hooks-options]: #hooksoptions

[api-markdown]: #markdown

[api-markdown-async]: #markdownasync

[api-markdown-hooks]: #markdownhooks

[api-options]: #options

[api-url-transform]: #urltransform

[author]: https://espen.codes/

[commonmark-help]: https://commonmark.org/help/

[commonmark-html]: https://spec.commonmark.org/0.31.2/#html-blocks

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[file-license]: license

[github-awesome-rehype]: https://github.com/rehypejs/awesome-rehype

[github-awesome-remark]: https://github.com/remarkjs/awesome-remark

[github-conorhastings]: https://github.com/conorhastings

[github-hast-element]: https://github.com/syntax-tree/hast#element

[github-hast-nodes]: https://github.com/syntax-tree/hast#nodes

[github-mdx]: https://github.com/mdx-js/mdx/

[github-micromark]: https://github.com/micromark/micromark

[github-rehype]: https://github.com/rehypejs/rehype

[github-rehype-katex]: https://github.com/remarkjs/remark-math/tree/main/packages/rehype-katex

[github-rehype-plugins]: https://github.com/rehypejs/rehype/blob/main/doc/plugins.md#list-of-plugins

[github-rehype-raw]: https://github.com/rehypejs/rehype-raw

[github-rehype-sanitize]: https://github.com/rehypejs/rehype-sanitize

[github-remark]: https://github.com/remarkjs/remark

[github-react-markdown]: https://github.com/remarkjs/react-markdown

[github-remark-gfm]: https://github.com/remarkjs/remark-gfm

[github-remark-math]: https://github.com/remarkjs/remark-math

[github-remark-plugins]: https://github.com/remarkjs/remark/blob/main/doc/plugins.md#list-of-plugins

[github-remark-rehype-options]: https://github.com/remarkjs/remark-rehype#options

[github-topic-rehype-plugin]: https://github.com/topics/rehype-plugin

[github-topic-remark-plugin]: https://github.com/topics/remark-plugin

[github-unified]: https://github.com/unifiedjs/unified

[health]: https://github.com/remarkjs/.github

[health-coc]: https://github.com/remarkjs/.github/blob/main/code-of-conduct.md

[health-contributing]: https://github.com/remarkjs/.github/blob/main/contributing.md

[health-support]: https://github.com/remarkjs/.github/blob/main/support.md

[npm-install]: https://docs.npmjs.com/cli/install

[vue]: https://cn.vuejs.org/

[section-components]: #appendix-b-components

[section-plugins]: #plugins

[section-security]: #security

[section-syntax]: #syntax

[typescript]: https://www.typescriptlang.org
