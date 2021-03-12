export type BACKGROUND_TO_DEVTOOLS_MESSAGE =
    | { type: 'CHUNK'; value: ATOM_LOG }
    | { type: 'UNLOAD' };

export type CONTENT_TO_BACKGROUND_MESSAGE =
    | { type: 'HYDRATION'; value: ATOM_LOG }
    | ATOM_LOG_ITEM;

export type ATOM_LOG_ITEM = {
    type: 'NEW_ATOM' | 'UPDATE_ATOM';
    key: string;
    value: any;
    uid: number;
    time: number;
};

export type ATOM_LOG = ATOM_LOG_ITEM[];
