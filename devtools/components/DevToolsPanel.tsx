import React from 'react';
import { useStateAtomLog } from './useStateAtomLog';
import { LogView } from './LogView';
import { Global, css } from '@emotion/react';

const GlobalStyle = {
    html: {
        fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: 14,
    },
    body: {
        margin: 0,
        padding: 0,
    },
};

const ContainerStyle = css({
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
});

const MainStyle = css({
    overflow: 'auto',
    maxHeight: '100%',
    flexGrow: 1,
});

export function DevToolsPanel() {
    const log = useStateAtomLog();

    return (
        <div css={ContainerStyle}>
            <Global styles={GlobalStyle} />
            <main css={MainStyle}>
                <LogView data={log}></LogView>
            </main>
        </div>
    );
}
