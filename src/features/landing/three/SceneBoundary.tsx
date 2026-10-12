import { Component, type ReactNode } from "react";

/** If the 3D scene throws (lost WebGL context, driver bug), show the fallback instead of blanking the page. */
export class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
