import JSZip from 'jszip';
import { Book } from '../types';

export interface ExtractedEpubMetadata {
  title: string;
  authors: string[];
  description: string;
  publisher: string;
  language: string;
  coverDataUrl?: string;
  spineItemCount: number;
}

export async function extractEpubMetadata(fileBuffer: ArrayBuffer): Promise<ExtractedEpubMetadata> {
  const zip = await JSZip.loadAsync(fileBuffer);

  // 1. Locate container.xml
  const containerXmlStr = await zip.file('META-INF/container.xml')?.async('string');
  let opfPath = 'OEBPS/content.opf';

  if (containerXmlStr) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(containerXmlStr, 'application/xml');
    const rootfile = doc.querySelector('rootfile');
    if (rootfile && rootfile.getAttribute('full-path')) {
      opfPath = rootfile.getAttribute('full-path')!;
    }
  }

  // 2. Read OPF file
  const opfStr = await zip.file(opfPath)?.async('string') || 
                 await zip.file(opfPath.replace('OEBPS/', ''))?.async('string');

  let title = 'Untitled EPUB';
  let authors: string[] = ['Unknown Author'];
  let description = '';
  let publisher = '';
  let language = 'en';
  let coverDataUrl: string | undefined = undefined;
  let spineItemCount = 10;

  if (opfStr) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(opfStr, 'application/xml');

    // Title
    const titleEl = doc.querySelector('title, dc\\:title');
    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    }

    // Creator / Authors
    const creatorEls = doc.querySelectorAll('creator, dc\\:creator');
    if (creatorEls.length > 0) {
      const foundAuthors: string[] = [];
      creatorEls.forEach((el) => {
        if (el.textContent?.trim()) {
          foundAuthors.push(el.textContent.trim());
        }
      });
      if (foundAuthors.length > 0) authors = foundAuthors;
    }

    // Description
    const descEl = doc.querySelector('description, dc\\:description');
    if (descEl && descEl.textContent) {
      description = descEl.textContent.trim();
    }

    // Publisher
    const pubEl = doc.querySelector('publisher, dc\\:publisher');
    if (pubEl && pubEl.textContent) {
      publisher = pubEl.textContent.trim();
    }

    // Language
    const langEl = doc.querySelector('language, dc\\:language');
    if (langEl && langEl.textContent) {
      language = langEl.textContent.trim();
    }

    // Spine item count (for page estimate)
    const spineEls = doc.querySelectorAll('spine > itemref');
    if (spineEls.length > 0) {
      spineItemCount = Math.max(spineEls.length * 15, 25);
    }

    // Try to extract Cover Image
    try {
      let coverHref: string | null = null;

      // Check meta name="cover"
      const metaCover = doc.querySelector('meta[name="cover"]');
      if (metaCover) {
        const coverId = metaCover.getAttribute('content');
        if (coverId) {
          const item = doc.querySelector(`item[id="${coverId}"]`);
          if (item) coverHref = item.getAttribute('href');
        }
      }

      // If not found, look for item with properties="cover-image" or id="cover"
      if (!coverHref) {
        const coverItem = doc.querySelector('item[properties*="cover-image"], item[id*="cover"], item[href*="cover"]');
        if (coverItem) {
          coverHref = coverItem.getAttribute('href');
        }
      }

      if (coverHref) {
        // Resolve path relative to OPF location
        const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
        const fullCoverPath = opfDir ? `${opfDir}${coverHref}` : coverHref;

        let coverFile = zip.file(fullCoverPath);
        if (!coverFile) {
          // Try searching in all files
          const fileName = coverHref.split('/').pop();
          if (fileName) {
            const matches = zip.file(new RegExp(fileName + '$', 'i'));
            if (matches && matches.length > 0) coverFile = matches[0];
          }
        }

        if (coverFile) {
          const base64 = await coverFile.async('base64');
          let mime = 'image/jpeg';
          if (coverHref.endsWith('.png')) mime = 'image/png';
          else if (coverHref.endsWith('.webp')) mime = 'image/webp';
          coverDataUrl = `data:${mime};base64,${base64}`;
        }
      }
    } catch (err) {
      console.warn('Could not extract cover image from EPUB', err);
    }
  }

  return {
    title,
    authors,
    description,
    publisher,
    language,
    coverDataUrl,
    spineItemCount,
  };
}

// Generate a starter sample EPUB in memory so users can test immediately
export async function createSampleEpubBlob(): Promise<Blob> {
  const zip = new JSZip();

  // mimetype
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // OEBPS/content.opf
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Meditations &amp; Philosophy of Reading</dc:title>
    <dc:creator>Marcus Aurelius &amp; Bibliotheca Classics</dc:creator>
    <dc:identifier id="BookID">urn:uuid:bibliotheca-sample-meditations</dc:identifier>
    <dc:language>en</dc:language>
    <dc:publisher>Bibliotheca Classic Editions</dc:publisher>
    <dc:description>A curated collection of reflections on wisdom, focus, and the quiet joy of personal reading, designed for the Bibliotheca 3D reader.</dc:description>
  </metadata>
  <manifest>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch3" href="ch3.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
    <itemref idref="ch3"/>
  </spine>
</package>`
  );

  // OEBPS/toc.xhtml
  zip.file(
    'OEBPS/toc.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="ch1.xhtml">Chapter I: On Tranquility of the Mind</a></li>
      <li><a href="ch2.xhtml">Chapter II: The Habit of Deep Reading</a></li>
      <li><a href="ch3.xhtml">Chapter III: Notes &amp; Marginalia as Living Dialogue</a></li>
    </ol>
  </nav>
</body>
</html>`
  );

  // OEBPS/style.css
  zip.file(
    'OEBPS/style.css',
    `body {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.75;
  padding: 1.5rem 1rem;
  color: #2C2C2C;
}
h1, h2, h3 {
  font-family: 'Playfair Display', Georgia, serif;
  color: #1a1a1a;
  line-height: 1.3;
}
h1 { font-size: 1.8rem; margin-bottom: 1.5rem; text-align: center; }
h2 { font-size: 1.4rem; margin-top: 2rem; margin-bottom: 1rem; }
p { margin-bottom: 1.25rem; text-indent: 1.5em; text-align: justify; }
p.lead { text-indent: 0; font-size: 1.1em; font-weight: 500; }
blockquote {
  margin: 1.5rem 1rem;
  padding: 0.75rem 1.25rem;
  border-left: 3px solid #5A5A40;
  background: rgba(90, 90, 64, 0.05);
  font-style: italic;
}
.chapter-header {
  text-align: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0,0,0,0.1);
}`
  );

  // OEBPS/ch1.xhtml
  zip.file(
    'OEBPS/ch1.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chapter I: On Tranquility of the Mind</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter-header">
    <p style="text-indent:0; text-transform:uppercase; letter-spacing:2px; font-size:0.8rem; color:#8C867A;">Book One</p>
    <h1>On Tranquility of the Mind</h1>
  </div>
  <p class="lead">When you arise in the morning, think of what a precious privilege it is to be alive—to breathe, to think, to enjoy, to love, and to read without distraction.</p>
  <p>Very little is needed to make a happy life; it is all within yourself, in your way of thinking. The soul becomes dyed with the color of its thoughts. If you surround your days with great books and deliberate contemplation, your inner citadel remains calm against external storms.</p>
  <blockquote>"You have power over your mind—not outside events. Realize this, and you will find strength."</blockquote>
  <p>Dwell on the beauty of life. Watch the stars, and see yourself running with them. Think constantly on the changes of the elements into each other, for such thoughts wash away the dust of earthly life. When you read a page, do not merely skim its surface; absorb its cadence and make its wisdom your own.</p>
  <p>Waste no more time arguing about what a good person should be. Be one. Let your books be faithful companions on the journey of quiet reflection.</p>
</body>
</html>`
  );

  // OEBPS/ch2.xhtml
  zip.file(
    'OEBPS/ch2.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chapter II: The Habit of Deep Reading</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter-header">
    <p style="text-indent:0; text-transform:uppercase; letter-spacing:2px; font-size:0.8rem; color:#8C867A;">Book Two</p>
    <h1>The Habit of Deep Reading</h1>
  </div>
  <p class="lead">A reader lives a thousand lives before they depart; those who never read live only one.</p>
  <p>To hold a book—whether bound in fine calfskin on a physical wooden shelf or rendered faithfully upon an electronic canvas—is to converse directly with the sharpest minds across thousands of years of human history. Time and distance dissolve across the printed page.</p>
  <p>When you encounter a sentence that quickens your pulse or clarifies a feeling you have long harbored in silence, highlight it. Make note of it. For highlighting is not merely marking ink upon paper; it is laying a milestone on the map of your intellectual development.</p>
  <blockquote>"Reading is to the mind what exercise is to the body. As by the one health is preserved, strengthened, and invigorated; by the other, virtue is kept alive, cherished, and confirmed."</blockquote>
  <p>Return often to the books that shaped you in youth. You will find that while the words have remained steadfast, you have changed, and the text now speaks with a deeper and more resonance voice.</p>
</body>
</html>`
  );

  // OEBPS/ch3.xhtml
  zip.file(
    'OEBPS/ch3.xhtml',
    `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Chapter III: Notes &amp; Marginalia as Living Dialogue</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter-header">
    <p style="text-indent:0; text-transform:uppercase; letter-spacing:2px; font-size:0.8rem; color:#8C867A;">Book Three</p>
    <h1>Notes &amp; Marginalia as Living Dialogue</h1>
  </div>
  <p class="lead">The margins of a book are where the author and the reader meet as equals.</p>
  <p>Throughout the centuries, scholars, poets, and curious minds have inscribed their deepest queries, agreements, and rebuttals into the margins of their codices. These marginal notes, or marginalia, transform a static monologue into a vibrant, living dialogue.</p>
  <p>By annotating key passages with your personal reflections, you synthesize new ideas and anchor memory. When you review your saved highlights weeks or years later, you rediscover not only the author's insights, but a snapshot of your own mind at the moment of discovery.</p>
  <blockquote>"The art of reading consists in remembering the essentials and forgetting the non-essentials."</blockquote>
  <p>Cherish your personal library. Build it shelf by shelf, volume by volume, thought by thought.</p>
</body>
</html>`
  );

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}
