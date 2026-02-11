import { createClient } from "https://esm.sh/@supabase/supabase-js@2.94.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateAnchorId(title: string, index: number): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 30);
  return `ch-${index + 1}-${slug || 'untitled'}`;
}

function parseContent(content: string) {
  const chapters: { title: string; content: string; chapterNumber: number; anchorId: string }[] = [];
  const lines = content.split('\n');
  let currentChapter: { title: string; lines: string[] } | null = null;
  
  // Enhanced chapter detection patterns
  const chapterRegex = /^(?:Chapter|CHAPTER)\s+(\d+|[IVXLC]+)(?:[:\.\s]+(.*))?$/i;
  const specialSectionRegex = /^(Prologue|PROLOGUE|Epilogue|EPILOGUE|Interlude|INTERLUDE|Introduction|INTRODUCTION|Preface|PREFACE)(?:[:\.\s]+(.*))?$/i;
  const mdHeaderRegex = /^#{1,2}\s+(.+)$/;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    const chapterMatch = trimmedLine.match(chapterRegex);
    const specialMatch = trimmedLine.match(specialSectionRegex);
    const mdMatch = trimmedLine.match(mdHeaderRegex);
    
    if (chapterMatch || specialMatch || mdMatch) {
      // Save previous chapter if it has content
      if (currentChapter && currentChapter.lines.length > 0) {
        const chapterContent = currentChapter.lines.join('\n').trim();
        // Only add if there's meaningful content (more than 50 chars)
        if (chapterContent.length > 50) {
          const idx = chapters.length;
          chapters.push({
            title: currentChapter.title,
            content: chapterContent,
            chapterNumber: idx + 1,
            anchorId: generateAnchorId(currentChapter.title, idx),
          });
        }
      }
      
      // Determine title for new chapter
      let title: string;
      if (chapterMatch) {
        title = chapterMatch[2] 
          ? `Chapter ${chapterMatch[1]}: ${chapterMatch[2].trim()}` 
          : `Chapter ${chapterMatch[1]}`;
      } else if (specialMatch) {
        const sectionName = specialMatch[1].charAt(0).toUpperCase() + specialMatch[1].slice(1).toLowerCase();
        title = specialMatch[2] ? `${sectionName}: ${specialMatch[2].trim()}` : sectionName;
      } else {
        title = mdMatch![1].trim();
      }
      
      currentChapter = { title, lines: [] };
    } else if (currentChapter) {
      currentChapter.lines.push(line);
    } else if (trimmedLine.length > 0) {
      // Content before any chapter heading - start an implicit first chapter
      currentChapter = { title: 'Introduction', lines: [line] };
    }
  }
  
  // Add final chapter
  if (currentChapter && currentChapter.lines.length > 0) {
    const chapterContent = currentChapter.lines.join('\n').trim();
    if (chapterContent.length > 50) {
      const idx = chapters.length;
      chapters.push({
        title: currentChapter.title,
        content: chapterContent,
        chapterNumber: idx + 1,
        anchorId: generateAnchorId(currentChapter.title, idx),
      });
    }
  }
  
  // Fallback: if no chapters detected, create one chapter with all content
  if (chapters.length === 0) {
    chapters.push({
      title: 'Chapter 1',
      content: content.trim(),
      chapterNumber: 1,
      anchorId: generateAnchorId('Chapter 1', 0),
    });
  }
  
  return chapters;
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip();
    await zip.loadAsync(buffer);

    // Get the main document content
    const documentXml = await zip.file('word/document.xml')?.async('string');

    if (!documentXml) {
      throw new Error('No document.xml found in DOCX');
    }

    // Parse XML to extract text with proper paragraph breaks preserved
    const paragraphs: string[] = [];

    // Split by paragraph tags and extract text
    const paraElements = documentXml.split(/<\/w:p>/);

    for (const para of paraElements) {
      // Extract all text runs within this paragraph
      const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);

      if (textMatches) {
        const paragraphText = textMatches
          .map(m => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
          .join('');

        // Add paragraph even if empty to preserve spacing
        paragraphs.push(paragraphText);
      } else {
        // Empty paragraph - preserve as blank line for spacing
        paragraphs.push('');
      }
    }

    // Join paragraphs with double newlines to create proper paragraph spacing
    // This ensures that each paragraph is visually separated
    return paragraphs.join('\n\n');
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error(`Failed to extract DOCX content: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('Auth failed: Missing or invalid Authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization header. Please log out and log back in.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      console.log('Auth failed: Empty token');
      return new Response(JSON.stringify({ error: 'Empty authorization token. Please log out and log back in.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Use getUser instead of getClaims for more reliable auth
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    const userId = userData?.user?.id;
    
    if (userError || !userId) {
      console.log('Auth failed: Invalid or expired token', userError?.message);
      return new Response(JSON.stringify({ error: 'Session expired. Please log out and log back in.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('User authenticated:', userId);

    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      console.log('Auth failed: User is not an admin', userId);
      return new Response(JSON.stringify({ error: 'Admin access required. Your account may not have admin privileges.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Admin verified:', userId);

    const { bookId, filePath, mode } = await req.json();
    
    if (!bookId || !filePath) {
      return new Response(JSON.stringify({ error: 'Missing bookId or filePath' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Processing manuscript:', { bookId, filePath, mode });

    const { data: fileData, error: dlErr } = await adminClient.storage.from('book-manuscripts').download(filePath);
    
    if (dlErr || !fileData) {
      console.log('Download failed:', dlErr?.message);
      return new Response(JSON.stringify({ error: `Failed to download manuscript: ${dlErr?.message}` }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const fileName = filePath.toLowerCase();
    let textContent = '';
    
    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      textContent = await fileData.text();
      console.log('Parsed TXT/MD, length:', textContent.length);
    } else if (fileName.endsWith('.docx')) {
      const buffer = await fileData.arrayBuffer();
      textContent = await extractDocxText(buffer);
      console.log('Parsed DOCX, length:', textContent.length);
    } else if (fileName.endsWith('.epub')) {
      return new Response(JSON.stringify({ error: 'EPUB format not supported. Please convert to DOCX or TXT.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else if (fileName.endsWith('.pdf')) {
      return new Response(JSON.stringify({ error: 'PDF format not supported. Please convert to DOCX or TXT.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported file format. Use DOCX, TXT, or MD.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!textContent || textContent.trim().length < 100) {
      return new Response(JSON.stringify({ error: 'Could not extract meaningful content from the file. Please check the file format.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const chapters = parseContent(textContent);
    console.log('Chapters detected:', chapters.length);

    if (mode === 'replace') {
      const { error: deleteErr } = await adminClient.from('chapters').delete().eq('book_id', bookId);
      if (deleteErr) {
        console.log('Failed to delete existing chapters:', deleteErr.message);
      }
    }

    let startNum = 1;
    if (mode === 'add') {
      const { data: existing } = await adminClient.from('chapters')
        .select('chapter_number').eq('book_id', bookId).order('chapter_number', { ascending: false }).limit(1);
      if (existing?.[0]) startNum = existing[0].chapter_number + 1;
    }

    const toInsert = chapters.map((ch, i) => ({
      book_id: bookId,
      title: ch.title,
      content: ch.content,
      chapter_number: startNum + i,
      anchor_id: ch.anchorId,
      word_count: ch.content.split(/\s+/).filter(Boolean).length,
      is_preview: i === 0,
    }));

    const { data: inserted, error: insErr } = await adminClient.from('chapters').insert(toInsert).select();

    if (insErr) {
      console.log('Insert failed:', insErr.message);
      return new Response(JSON.stringify({ error: `Failed to save chapters: ${insErr.message}` }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await adminClient.from('books').update({ updated_content_at: new Date().toISOString() }).eq('id', bookId);

    console.log('Success:', inserted?.length, 'chapters created');

    return new Response(JSON.stringify({ success: true, chaptersCreated: inserted?.length || 0 }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: `Unexpected error: ${error.message}` }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
