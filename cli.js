#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import { analyzeTranscript } from './analyzer.js';
import { generateMarkdown, saveMarkdown, convertToPdf } from './generator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settingsPath = path.join(__dirname, 'settings.json');
const outputDir = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function loadSettings() {
  if (fs.existsSync(settingsPath)) {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  }
  return {};
}

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

async function setupSettings() {
  console.log('\n--- First Time Setup ---\n');

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'businessName',
      message: 'Your business name:',
      default: 'Your Design Studio'
    },
    {
      type: 'input',
      name: 'businessEmail',
      message: 'Your email:',
      default: 'hello@example.com'
    },
    {
      type: 'input',
      name: 'businessPhone',
      message: 'Your phone (optional):',
      default: ''
    }
  ]);

  saveSettings(answers);
  console.log('\nSettings saved!\n');
  return answers;
}

async function getTranscript() {
  const { inputMethod } = await inquirer.prompt([
    {
      type: 'list',
      name: 'inputMethod',
      message: 'How would you like to provide the transcript?',
      choices: [
        { name: 'Paste text directly', value: 'paste' },
        { name: 'Load from file', value: 'file' }
      ]
    }
  ]);

  if (inputMethod === 'file') {
    const { filePath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filePath',
        message: 'Enter file path:',
        validate: (input) => {
          if (fs.existsSync(input)) return true;
          return 'File not found. Please enter a valid path.';
        }
      }
    ]);
    return fs.readFileSync(filePath, 'utf-8');
  }

  const { transcript } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'transcript',
      message: 'Paste your transcript (opens editor):'
    }
  ]);

  return transcript;
}

async function main() {
  console.log('\n=================================');
  console.log('  Web Design Proposal Generator  ');
  console.log('=================================\n');

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('Error: ANTHROPIC_API_KEY not set.');
    console.log('Set it with: export ANTHROPIC_API_KEY=your-key-here\n');
    process.exit(1);
  }

  // Load or setup settings
  let settings = loadSettings();
  if (!settings.businessName) {
    settings = await setupSettings();
  }

  // Get transcript
  console.log('\n--- Step 1: Input Transcript ---\n');
  const transcript = await getTranscript();

  if (!transcript.trim()) {
    console.log('No transcript provided. Exiting.');
    process.exit(1);
  }

  // Get additional notes
  const { notes } = await inquirer.prompt([
    {
      type: 'input',
      name: 'notes',
      message: 'Any additional notes? (optional):',
      default: ''
    }
  ]);

  // Get project total
  const { projectTotal } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectTotal',
      message: 'Total project investment ($):',
      default: '5000',
      validate: (input) => {
        const num = parseInt(input.replace(/[,$]/g, ''));
        if (isNaN(num) || num <= 0) return 'Please enter a valid amount';
        return true;
      },
      filter: (input) => parseInt(input.replace(/[,$]/g, ''))
    }
  ]);

  // Analyze with Claude
  console.log('\n--- Step 2: Analyzing with AI ---\n');
  console.log('Processing transcript...');

  let analysisData;
  try {
    analysisData = await analyzeTranscript(transcript, notes);
    analysisData.project_total = projectTotal;
    console.log('Analysis complete!\n');
  } catch (error) {
    console.error('Error analyzing transcript:', error.message);
    process.exit(1);
  }

  // Generate markdown preview
  const timestamp = Date.now();
  const safeName = analysisData.client_name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const mdPath = path.join(outputDir, `proposal-${safeName}-${timestamp}.md`);
  const pdfPath = path.join(outputDir, `proposal-${safeName}-${timestamp}.pdf`);

  const markdown = generateMarkdown(analysisData, settings);
  saveMarkdown(markdown, mdPath);

  console.log(`--- Step 3: Review ---\n`);
  console.log(`Preview saved to:\n${mdPath}\n`);

  // Review loop
  let done = false;
  while (!done) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Open markdown for editing', value: 'edit' },
          { name: 'Generate PDF', value: 'pdf' },
          { name: 'View analysis summary', value: 'summary' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    switch (action) {
      case 'edit':
        console.log(`\nOpening: ${mdPath}`);
        const { exec } = await import('child_process');
        exec(`open "${mdPath}"`);
        console.log('Edit the file, save it, then come back here.\n');
        await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter when done editing...' }]);
        break;

      case 'pdf':
        console.log('\nGenerating PDF...');
        try {
          await convertToPdf(mdPath, pdfPath);
          console.log(`\nPDF saved to:\n${pdfPath}\n`);

          const { openPdf } = await inquirer.prompt([
            { type: 'confirm', name: 'openPdf', message: 'Open PDF now?', default: true }
          ]);
          if (openPdf) {
            const { exec } = await import('child_process');
            exec(`open "${pdfPath}"`);
          }
        } catch (error) {
          console.error('Error generating PDF:', error.message);
        }
        break;

      case 'summary':
        console.log('\n--- Analysis Summary ---\n');
        console.log(`Client: ${analysisData.client_name}`);
        console.log(`Deliverables: ${analysisData.deliverables.length} items`);
        console.log(`Timeline: ${analysisData.timeline.length} phases`);
        console.log(`Client needs: ${analysisData.client_needs.length} items`);
        console.log('');
        break;

      case 'exit':
        done = true;
        break;
    }
  }

  console.log('\nDone! Files saved in:', outputDir);
  console.log('Goodbye!\n');
}

main().catch(console.error);
