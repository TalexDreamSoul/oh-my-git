import { lazy } from 'react';

export const LazyFileEditorModal = lazy(() => import('./FileEditorModal').then((module) => ({ default: module.FileEditorModal })));
