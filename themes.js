// Lists the settings menus and the placeholder prompts are built from.
// The colours for each theme live in styles.css, under html[data-theme="..."].
window.Todo = window.Todo || {};

window.Todo.THEMES = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'forest', label: 'Forest' },
  { id: 'nord', label: 'Nord' },
  { id: 'dracula', label: 'Dracula' },
  { id: 'solarized', label: 'Solarized' },
  { id: 'rose', label: 'Rosé' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'vaporwave', label: 'Vaporwave' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
];

// Stacks use fonts already installed on the machine, so the app works offline.
window.Todo.FONTS = [
  { id: 'sans', label: 'System sans', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { id: 'serif', label: 'Serif', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Mono', stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
  { id: 'typewriter', label: 'Typewriter', stack: '"Courier New", Courier, monospace' },
  { id: 'garamond', label: 'Garamond', stack: 'Garamond, "EB Garamond", "Palatino Linotype", serif' },
  { id: 'humanist', label: 'Humanist', stack: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },
  { id: 'modern', label: 'Modern', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { id: 'condensed', label: 'Condensed', stack: '"Arial Narrow", "Franklin Gothic Medium", sans-serif' },
  { id: 'rounded', label: 'Rounded', stack: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif' },
  { id: 'handwriting', label: 'Handwriting', stack: '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive' },
  { id: 'code', label: 'Code', stack: '"Cascadia Code", "Fira Code", Consolas, monospace' },
];

// Shown as placeholder text in the composer, and by the shuffle button.
window.Todo.WORDS = [
  'Something you would build on a Sunday',
  'The thing you keep postponing',
  'A name for a side project',
  'A tiny habit to try this week',
  'Sketch the ugliest version first',
  'Ask someone for feedback',
  'A question you have not answered',
  'Something to make for someone else',
  'Clean one drawer, just one',
  'Write the title before the body',
  'A book you keep meaning to start',
  'The smallest possible first step',
  'Something you would teach a friend',
  'An idea that scares you a little',
  'Fix the thing that annoys you daily',
  'A place you want to visit',
  'Take a photo of something ordinary',
  'The email you are avoiding',
  'A recipe you could improve',
  'Rename the file you keep avoiding',
  'Write down three things you noticed today',
  'An experiment with a one day deadline',
  'Something you could automate',
  'A better name for this list',
];
