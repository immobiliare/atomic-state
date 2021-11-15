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

const ContainerStyle = css({
    display: 'flex',
    flexDirection: 'column-reverse',
    background: '#ddd',
    width: '100%',
    gap: '6px',
});

const RowStyle = css({
    background: '#fff',
    border: '1px solid #ddd',
});

const MainRowStyle = css({
    fontWeight: '600' as 'bold',
    padding: '4px 0 0 8px',
    animation: `${highlight} 0.6s`,
});

const ButtonToggleStyle = css({
    display: 'inline-block',
    marginRight: '2px',
    fontWeight: '400' as 'bolder',
    fontSize: '0.8em',
    float: 'right',
    padding: '1px',
});

const NewLabelStyle = css({
    display: 'inline-block',
    marginLeft: '2px',
    fontWeight: '400' as 'bolder',
    fontSize: '0.5em',
    background: 'green',
    color: 'white',
    padding: '1px',
});

const UpdateLabelStyle = css({
    display: 'inline-block',
    marginLeft: '2px',
    fontWeight: '400' as 'bolder',
    fontSize: '0.8em',
});

export function LogView({ data }: { data: ATOM_LOG }) {
    const [hiddenKeys, setHiddenKeys] = useState<string[]>(() => {
        const saved = localStorage.getItem('hiddenKeys');

        if (saved) return JSON.parse(saved);

        return [];
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
        <div css={ContainerStyle}>
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
                    <div css={RowStyle} key={uid}>
                        {!sameAsNext && (
                            <div css={MainRowStyle}>
                                {key}
                                <button
                                    css={ButtonToggleStyle}
                                    onClick={() => toggleKey(key)}
                                >
                                    {visible ? 'hide' : 'show'}
                                </button>
                                {type === 'NEW_ATOM' ? (
                                    <span css={NewLabelStyle}>NEW</span>
                                ) : null}
                                {updates > 1 ? (
                                    <span css={UpdateLabelStyle}>
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
