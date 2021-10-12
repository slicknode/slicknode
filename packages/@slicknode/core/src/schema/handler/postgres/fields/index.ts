/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */

// Export field type handlers
import StringHandler from './StringHandler';
import FloatHandler from './FloatHandler';
import IntHandler from './IntHandler';
import BooleanHandler from './BooleanHandler';
import DateTimeHandler from './DateTimeHandler';
import IDHandler from './IDHandler';
import EnumHandler from './EnumHandler';
import RelatedObjectHandler from './RelatedObjectHandler';
import DecimalHandler from './DecimalHandler';
import ContentHandler from './ContentHandler';
import ContentUnionHandler from './ContentUnionHandler';

export const String = new StringHandler();
export const Float = new FloatHandler();
export const Int = new IntHandler();
export const Boolean = new BooleanHandler();
export const DateTime = new DateTimeHandler();
export const ID = new IDHandler();
export const Enum = new EnumHandler();
export const RelatedObject = new RelatedObjectHandler();
export const Decimal = new DecimalHandler();
export const Content = new ContentHandler();
export const ContentUnion = new ContentUnionHandler();
