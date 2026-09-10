import { LegalDocument, DocumentChunk } from './db.js';

export interface ChunkOptions {
  maxChunkSize?: number; // target character count, default 1000
  overlap?: number; // character overlap, default 150
}

export class DocumentChunker {
  /**
   * Splits a raw legal document into semantically grounded chunks,
   * respecting legal structure (Sections, Articles, Paragraphs) and tracking metadata.
   */
  public static chunkDocument(
    doc: LegalDocument,
    rawText: string,
    options: ChunkOptions = {}
  ): Omit<DocumentChunk, 'embedding'>[] {
    const maxChunkSize = options.maxChunkSize || 1000;
    const overlap = options.overlap || 150;

    // Detect page breaks if marked by form feed \f or [PAGE: X] or --- Page X ---
    const pageSplits = rawText.split(/(?:\f|\n--- Page \d+ ---|\n\[Page \d+\])/i);
    const pagesWithText: { pageNumber: number; text: string }[] = [];

    if (pageSplits.length > 1) {
      pageSplits.forEach((pText, idx) => {
        pagesWithText.push({ pageNumber: idx + 1, text: pText });
      });
    } else {
      // Estimate pages if not explicitly delimited (approx 2500 chars per page)
      const approxPageLen = 2500;
      let pIdx = 0;
      for (let i = 0; i < rawText.length; i += approxPageLen) {
        pIdx++;
        pagesWithText.push({
          pageNumber: pIdx,
          text: rawText.slice(i, i + approxPageLen),
        });
      }
    }

    const chunks: Omit<DocumentChunk, 'embedding'>[] = [];
    let chunkIndex = 0;

    for (const pageItem of pagesWithText) {
      const pageText = pageItem.text.trim();
      if (!pageText) continue;

      // Detect legal section breaks: "Section 1798.100", "Article 15", "§ 2-314", "Clause 4"
      const sectionRegex = /(?:^|\n)(?=(?:Section\s+\d+|Article\s+\d+|§\s*[\d\w.-]+|Clause\s+\d+|Chapter\s+\d+))/i;
      const rawSections = pageText.split(sectionRegex);

      for (const sectionBlock of rawSections) {
        const trimmedSection = sectionBlock.trim();
        if (!trimmedSection) continue;

        // Try to identify the current section label
        const sectionMatch = trimmedSection.match(/^(?:Section\s+[\d\w.-]+|Article\s+[\d\w.-]+|§\s*[\d\w.-]+|Clause\s+[\d\w.-]+|Chapter\s+[\d\w.-]+)/i);
        const currentSection = sectionMatch ? sectionMatch[0].trim() : `Part ${chunkIndex + 1}`;

        // If the section text exceeds maxChunkSize, split with sliding window
        if (trimmedSection.length <= maxChunkSize) {
          chunkIndex++;
          chunks.push({
            id: `${doc.id}_chunk_${chunkIndex}`,
            document_id: doc.id,
            chunk_index: chunkIndex,
            content: trimmedSection,
            page_number: pageItem.pageNumber,
            section: currentSection,
            act_name: doc.title,
            citation_label: `${doc.title} - ${currentSection} (Page ${pageItem.pageNumber})`,
            metadata: {
              document_id: doc.id,
              source: doc.source,
              title: doc.title,
              jurisdiction: doc.jurisdiction,
              document_type: doc.document_type,
              version: doc.version,
              effective_date: doc.effective_date,
              page: pageItem.pageNumber,
              section: currentSection,
              act_name: doc.title,
            },
            created_at: new Date().toISOString(),
          });
        } else {
          // Split into overlapping sub-chunks at paragraph or sentence boundaries
          let start = 0;
          while (start < trimmedSection.length) {
            let end = start + maxChunkSize;
            if (end < trimmedSection.length) {
              // Look for a newline or period boundary near the end
              const boundary = trimmedSection.lastIndexOf('\n', end);
              const sentenceEnd = trimmedSection.lastIndexOf('. ', end);
              if (boundary > start + maxChunkSize * 0.6) {
                end = boundary;
              } else if (sentenceEnd > start + maxChunkSize * 0.6) {
                end = sentenceEnd + 1;
              }
            } else {
              end = trimmedSection.length;
            }

            const subContent = trimmedSection.slice(start, end).trim();
            if (subContent.length > 30) {
              chunkIndex++;
              chunks.push({
                id: `${doc.id}_chunk_${chunkIndex}`,
                document_id: doc.id,
                chunk_index: chunkIndex,
                content: subContent,
                page_number: pageItem.pageNumber,
                section: currentSection,
                act_name: doc.title,
                citation_label: `${doc.title} - ${currentSection} (Page ${pageItem.pageNumber})`,
                metadata: {
                  document_id: doc.id,
                  source: doc.source,
                  title: doc.title,
                  jurisdiction: doc.jurisdiction,
                  document_type: doc.document_type,
                  version: doc.version,
                  effective_date: doc.effective_date,
                  page: pageItem.pageNumber,
                  section: currentSection,
                  act_name: doc.title,
                  sub_chunk: true,
                },
                created_at: new Date().toISOString(),
              });
            }

            if (end >= trimmedSection.length) break;
            start = end - overlap;
          }
        }
      }
    }

    return chunks;
  }
}
