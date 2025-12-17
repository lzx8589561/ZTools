import { blue, cyan, green, red, yellow } from 'kolorist'
import prompts from 'prompts'
import { generateProject } from './generator.js'
import type { TemplateConfig } from './types.js'
import { detectPackageManager } from './utils.js'

const TEMPLATES: TemplateConfig[] = [
  {
    name: 'vue-vite',
    display: 'Vue + TypeScript + Vite',
    color: green
  },
  {
    name: 'react-vite',
    display: 'React + TypeScript + Vite',
    color: cyan
  },
  {
    name: 'preload-only',
    display: 'Preload Only (TypeScript)',
    color: yellow
  }
]

/**
 * 创建项目
 */
export async function create(projectName?: string): Promise<void> {
  console.log()
  console.log(blue('🚀 Welcome to ZTools Plugin CLI\n'))

  let result: prompts.Answers<string>

  try {
    // 输入项目名称
    if (!projectName) {
      result = await prompts({
        type: 'text',
        name: 'projectName',
        message: 'Project name:',
        initial: 'my-ztools-plugin',
        validate: (value) => {
          if (!value) return 'Project name is required'
          if (!/^[a-z0-9-]+$/.test(value)) {
            return 'Project name can only contain lowercase letters, numbers, and hyphens'
          }
          return true
        }
      })

      if (!result.projectName) {
        console.log(red('✖ Operation cancelled'))
        process.exit(0)
      }

      projectName = result.projectName
    }

    // 选择模板
    result = await prompts({
      type: 'select',
      name: 'template',
      message: 'Select a template:',
      choices: TEMPLATES.map((t) => ({
        title: t.color(t.display),
        value: t.name
      }))
    })

    if (!result.template) {
      console.log(red('✖ Operation cancelled'))
      process.exit(0)
    }

    // 输入插件信息
    const pluginInfo = await prompts([
      {
        type: 'text',
        name: 'pluginName',
        message: 'Plugin name (displayed in ZTools):',
        initial: projectName!.replace(/-/g, ' '),
        validate: (value) => (value ? true : 'Plugin name is required')
      },
      {
        type: 'text',
        name: 'description',
        message: 'Plugin description:',
        initial: 'A ZTools plugin'
      },
      {
        type: 'text',
        name: 'author',
        message: 'Author:',
        initial: 'Your Name'
      }
    ])

    if (!pluginInfo.pluginName) {
      console.log(red('✖ Operation cancelled'))
      process.exit(0)
    }

    // 生成项目
    await generateProject({
      projectName: projectName!,
      template: result.template,
      pluginName: pluginInfo.pluginName,
      description: pluginInfo.description || 'A ZTools plugin',
      author: pluginInfo.author || 'Your Name'
    })

    // 显示后续步骤
    const templateName =
      TEMPLATES.find((t) => t.name === result.template)?.display || result.template
    const pm = detectPackageManager()

    console.log(`📁 Project location: ${green(`./${projectName}`)}\n`)
    console.log(`📦 Template: ${blue(templateName)}\n`)
    console.log(`📝 Next steps:\n`)
    console.log(`  ${cyan(`cd ${projectName}`)}`)
    console.log(`  ${cyan(`${pm} install`)}`)
    console.log(`  ${cyan(`${pm} run dev`)}\n`)
    console.log(`📚 Documentation:`)
    console.log(`  - ZTools: ${blue('https://github.com/ZToolsCenter/ZTools')}`)
    console.log(
      `  - API Types: ${blue('https://www.npmjs.com/package/@ztools-center/ztools-api-types')}\n`
    )
  } catch (error) {
    console.error(red(`\n✖ Error: ${error instanceof Error ? error.message : 'Unknown error'}`))
    process.exit(1)
  }
}
