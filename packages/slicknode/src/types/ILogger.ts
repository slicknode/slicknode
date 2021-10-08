/**
 * Created by Ivo Meißner on 07.08.17.
 *
 * @flow
 */

export interface ILogger {
  info(...args: any[]): void;
  debug(...args: any[]): void;
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  errorLogged(): boolean;
}
