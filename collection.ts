export interface CollectionBase {
  dir: string;
  command: string;
  domains: string[];
}

export interface Collection extends CollectionBase {
  name: string;
}

export function collectionForURL(
  collections: Collection[],
  url: string,
): Collection | null {
  const collection = collections.find((
    collection,
  ) => collection.domains.some((d) => url.includes(d)));

  if (collection) {
    return collection;
  } else {
    return null;
  }
}
