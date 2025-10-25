/**
 * Shared types and interfaces for the DTO-Entity-Mapper pattern
 */

/**
 * Generic type for mapper conversion functions
 */
export type MapperFunction<TSource, TTarget> = (source: TSource) => TTarget;

/**
 * Generic type for array mapper conversion functions
 */
export type ArrayMapperFunction<TSource, TTarget> = (
  sources: TSource[],
) => TTarget[];

/**
 * Configuration options for mappers
 */
export interface MapperOptions {
  /**
   * Whether to throw errors on null/undefined values
   */
  strictMode?: boolean;

  /**
   * Whether to automatically trim string values
   */
  autoTrim?: boolean;

  /**
   * Whether to automatically convert strings to lowercase
   */
  autoLowerCase?: boolean;
}

/**
 * Result type for mapper operations that might fail
 */
export interface MapperResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Base interface for entities with common properties
 */
export interface IEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base interface for DTOs with validation metadata
 */
export interface IDto {
  [key: string]: any;
}

/**
 * Import the base mapper interface
 */
import { IMapper } from '../mappers/base.mapper';

/**
 * Mapper registry for dynamic mapper resolution
 */
export interface IMapperRegistry {
  register<TDto, TEntity>(key: string, mapper: IMapper<TDto, TEntity>): void;
  get<TDto, TEntity>(key: string): IMapper<TDto, TEntity> | undefined;
  has(key: string): boolean;
}

/**
 * Re-export the base mapper interface and class
 */
export { IMapper, BaseMapper } from '../mappers/base.mapper';
