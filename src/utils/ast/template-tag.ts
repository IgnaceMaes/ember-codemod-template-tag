import { AST as AST_JS } from '@codemod-utils/ast-javascript';
import { Preprocessor } from 'content-tag';
import { types } from 'recast';

type Range = {
  end: number;
  start: number;
};

type ContentTag = {
  contentRange: Range;
  contents: string;
  endRange: Range;
  range: Range; // range = startRange + contentRange + endRange
  startRange: Range;
  tagName: string;
  type: string;
};

type ContentTagPlaceholder = {
  contents: string;
  id: string;
};

export function parse(file: string) {
  const preprocessor = new Preprocessor();

  return preprocessor.parse(file) as unknown as ContentTag[];
}

export function replaceContents(
  file: string,
  options: {
    contents: string;
    range: Range;
  },
): string {
  const { contents, range } = options;

  return [
    file.substring(0, range.start),
    '<template>',
    contents,
    '</template>',
    file.substring(range.end),
  ].join('');
}

function _print(
  ast: types.ASTNode,
  contentTags: ContentTagPlaceholder[],
): string {
  let output = AST_JS.print(ast);

  const placeholderContentTags = parse(output);
  if (placeholderContentTags.length !== contentTags.length) {
    throw new Error('The number of content tags does not match');
  }
  placeholderContentTags.reverse().forEach((placeholderContentTag) => {
    const match = contentTags.find(
      (contentTag) => contentTag.id === placeholderContentTag.contents,
    );
    if (match === undefined) {
      throw new Error(
        `Expected content tag with id "${placeholderContentTag.contents}" to exist, but no match was found.`,
      );
    }
    output = replaceContents(output, {
      contents: match.contents,
      range: placeholderContentTag.range,
    });
  });

  return output;
}

interface TraverseTT {
  ast: types.ASTNode;
  contentTags: ContentTagPlaceholder[];
}

function _traverse(
  isTypeScript?: boolean,
): (file: string, visitMethods?: types.Visitor) => TraverseTT {
  const originalTraverse = AST_JS.traverse(isTypeScript);
  return function (
    file: string,
    visitMethods?: types.Visitor<unknown> | undefined,
  ): TraverseTT {
    const contentTags = parse(file);
    const contentTagPlaceholders: ContentTagPlaceholder[] = [];
    contentTags.reverse().forEach((contentTag, index) => {
      const placeholderId = `${index}`;
      file = replaceContents(file, {
        contents: placeholderId,
        range: contentTag.range,
      });
      contentTagPlaceholders.push({
        contents: contentTag.contents,
        id: placeholderId,
      });
    });

    return {
      ast: originalTraverse(file, visitMethods),
      contentTags: contentTagPlaceholders,
    };
  };
}

/**
 * Provides methods from `recast` to help you parse and transform
 * `*.{gjs,gts}` files.
 *
 * @example
 *
 * ```ts
 * function transformCode(file: string, isTypeScript: boolean): string {
 *   const traverse = AST.traverse(isTypeScript);
 *
 *   const { ast, contentTags } = traverse(file, {
 *     // Use AST.builders to transform the tree
 *   });
 *
 *   return AST.print(ast, contentTags);
 * }
 * ```
 */
export const AST = {
  builders: AST_JS.builders,
  print: _print,
  traverse: _traverse,
};
