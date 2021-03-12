import { css, keyframes } from '@emotion/react';
import React, { useEffect, useState } from 'react';
import { ATOM_LOG } from '../types';
import { ObjectViewer } from './ObjectViewer';

const highlight = keyframes`
  from, to {
    background: #FFF;
  }

  50% {
    background: #EEE;
  }
`;

export function LogView({ data }: { data: ATOM_LOG }) {
    const [hiddenKeys, setHiddenKeys] = useState<string[]>(() => {
        const saved = localStorage.getItem('hiddenKeys');

        if (saved) return JSON.parse(saved);

        return []
    });

    function toggleKey(key: string) {
        setHiddenKeys((value) =>
            value.includes(key)
                ? value.filter((v) => v !== key)
                : value.concat(key)
        );
    }

    useEffect(() => {
        localStorage.setItem('hiddenKeys', JSON.stringify(hiddenKeys));
    }, [hiddenKeys]);

    return data.length ? (
        <div
            css={css`
                display: flex;
                flex-direction: column-reverse;
                background: #ddd;
                width: 100%;
                gap: 6px;
            `}
        >
            {data.map(({ key, value, uid, type }, i, list) => {
                const sameAsPrev = list[i - 1] && list[i - 1].key === key;
                const sameAsNext = list[i + 1] && list[i + 1].key === key;

                let updates = 1;

                if (sameAsPrev && !sameAsNext) {
                    let j = i - 1;

                    while (list[j] && list[j].key === key) {
                        updates++;
                        j--;
                    }
                }

                const visible = !hiddenKeys.includes(key);

                if (sameAsNext && !visible) return null;

                return (
                    <div
                        css={css`
                            background: #fff;
                            border: 1px solid #ddd;
                        `}
                        key={uid}
                    >
                        {!sameAsNext && (
                            <div
                                css={css`
                                    font-weight: 600;
                                    padding: 4px 0 0 8px;
                                    animation: ${highlight} 0.6s;
                                `}
                            >
                                {key}
                                <button
                                    css={css`
                                        display: inline-block;
                                        margin-right: 2px;
                                        font-weight: 400;
                                        font-size: 0.8em;
                                        float: right;
                                        padding: 1px;
                                    `}
                                    onClick={() => toggleKey(key)}
                                >
                                    {visible ? 'hide' : 'show'}
                                </button>
                                {type === 'NEW_ATOM' ? (
                                    <span
                                        css={css`
                                            display: inline-block;
                                            margin-left: 2px;
                                            font-weight: 400;
                                            font-size: 0.5em;
                                            background: green;
                                            color: white;
                                            padding: 1px;
                                        `}
                                    >
                                        NEW
                                    </span>
                                ) : null}
                                {updates > 1 ? (
                                    <span
                                        css={css`
                                            display: inline-block;
                                            margin-left: 2px;
                                            font-weight: 400;
                                            font-size: 0.8em;
                                        `}
                                    >
                                        {updates} updates
                                    </span>
                                ) : null}
                            </div>
                        )}
                        {visible ? (
                            <div>
                                <ObjectViewer data={value} />
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    ) : null;
}
