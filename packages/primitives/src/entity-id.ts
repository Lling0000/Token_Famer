import { DomainInvariantError } from './invariant-error';

declare const entityIdBrand: unique symbol;
export type EntityId = string & { readonly [entityIdBrand]: 'EntityId' };

export function entityId(value: string): EntityId {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 128) {
    throw new DomainInvariantError(
      'INVALID_ENTITY_ID',
      'Entity ID must contain 1 to 128 characters',
    );
  }
  return normalized as EntityId;
}
