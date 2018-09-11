/**
 * Created by Ivo Meißner on 11.08.17.
 *
 * @flow
 */

/* tslint:disable no-console */

export default class ConsoleLogger {
  private errorWasLogged: boolean;

  constructor() {
    this.errorWasLogged = false;
  }

  public info(...args: any[]): void {
    console.info(...args);
  }
  public debug(...args: any[]): void {
    console.debug(...args);
  }
  public log(...args: any[]): void {
    console.log(...args);
  }
  public warn(...args: any[]): void {
    console.warn(...args);
  }
  public error(...args: any[]): void {
    console.error(...args);
  }

  public errorLogged(): boolean {
    return this.errorWasLogged;
  }
}
