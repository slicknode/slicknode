/**
 * Created by Ivo Meißner on 11.08.17.
 */

export default class TestLogger {
  private errorWasLogged: boolean;
  private infoOutput: string;
  private debugOutput: string;
  private logOutput: string;
  private warnOutput: string;
  private errorOutput: string;

  constructor() {
    this.errorWasLogged = false;

    this.infoOutput = '';
    this.debugOutput = '';
    this.logOutput = '';
    this.warnOutput = '';
    this.errorOutput = '';
  }

  public info(...args: any[]): void {
    if (this.infoOutput) {
      this.infoOutput += '\n';
    }
    this.infoOutput += args.join(' ');
  }
  public debug(...args: any[]): void {
    if (this.debugOutput) {
      this.debugOutput += '\n';
    }
    this.debugOutput += args.join(' ');
  }
  public log(...args: any[]): void {
    if (this.logOutput) {
      this.logOutput += '\n';
    }
    this.logOutput += args.join(' ');
  }
  public warn(...args: any[]): void {
    if (this.warnOutput) {
      this.warnOutput += '\n';
    }
    this.warnOutput += args.join(' ');
  }
  public error(...args: any[]): void {
    if (this.errorOutput) {
      this.errorOutput += '\n';
    }
    this.errorOutput += args.join(' ');
  }

  public errorLogged(): boolean {
    return this.errorWasLogged;
  }

  public getError(): string { return this.errorOutput; }
  public getInfo(): string { return this.infoOutput; }
  public getDebug(): string { return this.debugOutput; }
  public getLog(): string { return this.logOutput; }
  public getWarn(): string { return this.warnOutput; }
}
