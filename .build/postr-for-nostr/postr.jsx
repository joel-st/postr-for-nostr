// import internationalization stuff from wp.i18n
const { __, _x, _n, _nx } = wp.i18n;

// import react stuff from wp.element
const { render, useEffect, useState, Fragment, useRef } = wp.element;

// import nostr-tools
import { nip19, SimplePool, getEventHash } from 'nostr-tools'
const nostr_tools = { nip19, SimplePool, getEventHash };

const DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.nostr.band/'
]

// initialize and render postr-for-nostr component
export function init(element) {
    render(<NostrPostr />, element);
}

// the postr-for-nostr component
const NostrPostr = (props) => {

    // unless this is false, the component shows the initializing element
    const [initializing, set_initializing] = useState(true);

    // check if nip-07/window.nostr extension is available 
    const [nip07, set_nip07] = useState(false);
    useEffect(() => {
        window.addEventListener('load', function () {
            if (window.nostr) {
                setTimeout(() => {
                    set_nip07({ status: true, data: false });
                }, 250);
            } else {
                setTimeout(() => {
                    set_nip07({ status: false, data: _x('NIP-07 extension could not be detected. Make sure to have a NIP-07 extension installed, then reload this window and try again.', 'react component error', 'postr-for-nostr') });
                }, 250);
            };
        })
    }, []);

    // if nip07 check if post_data is valid
    const [post_data, set_post_data] = useState(false);
    useEffect(() => {
        if (nip07 && nip07.status) {
            setTimeout(() => {
                if (postr_for_nostr_localize.data.post_data) {
                    if (postr_for_nostr_localize.data.post_type in postr_for_nostr_localize.data.post_types) {
                        set_post_data({ status: true, data: postr_for_nostr_localize.data.post_data });
                    } else {
                        set_post_data({ status: false, data: _x('Posts from this post type cannot be postred.', 'component error', 'postr-for-nostr') });
                    }
                } else {
                    set_post_data({ status: false, data: _x('Invalid Post Data', 'component error', 'postr-for-nostr') });
                }
            }, 250)
        }
    }, [nip07]);

    // if post_data is valid get public key with nip-07
    // if public key is retrieved, finish initializing
    const [public_key_hex, set_public_key_hex] = useState(false);
    useEffect(() => {
        if (post_data && post_data.status && (!public_key_hex || !public_key_hex.status)) {
            window.nostr.getPublicKey()
                .catch((error) => {
                    set_public_key_hex({ status: false, data: error.message });
                })
                .then((response) => {
                    if (response) {
                        set_public_key_hex({ status: true, data: response });
                        setTimeout(() => {
                            document.body.classList.remove('postr-for-nostr-app--initializing');
                            set_initializing(false);
                        }, 500);
                    } else {
                        set_public_key_hex({ status: false, data: _x('User denied', 'component error', 'postr-for-nostr') });
                    }

                });
        }
    }, [post_data]);

    // if public key is available, fetch relay list (kind 10002) and profile information (kind 0)
    const [relays, set_relays] = useState(DEFAULT_RELAYS);
    const [postr_profile, set_postr_profile] = useState({
        name: _x('Anonymous Postr', 'postr profile component name', 'postr-for-nostr'),
        picture: postr_for_nostr_localize.data.profile_placeholder,
        npub: 'xxxxxxxxxxxxxxxxx',
        fetch: true
    });

    useEffect(() => {
        if (public_key_hex.status) {
            set_postr_profile({ ...postr_profile, npub: nostr_tools.nip19.npubEncode(public_key_hex.data), pubkey: public_key_hex.data, fetch: true });
            // start fetching relays for kind 0 and 10002
            const pool = new nostr_tools.SimplePool();
            const subs = {};

            // Connect to relays using the latest nostr-tools implementation
            const getProfileAndRelays = async (relayUrls) => {
                try {
                    // Create a new SimplePool instance
                    const pool = new nostr_tools.SimplePool();
                    
                    // Subscribe to user metadata (kind 0) and relay list (kind 10002)
                    const subscription = pool.subscribeMany(
                        relayUrls,
                        [{ authors: [public_key_hex.data], kinds: [0, 10002] }],
                        {
                            onevent(event) {
                                
                                // Handle profile metadata (kind 0)
                                if (event.kind === 0) {
                                    // console.log('Received profile event (kind 0):', event);

                                    try {
                                        const content = JSON.parse(event.content);
                                        let postr_profile_update = { ...postr_profile };
                                        postr_profile_update.pubkey = public_key_hex.data;
                                        postr_profile_update.npub = nostr_tools.nip19.npubEncode(public_key_hex.data);
                                        postr_profile_update.fetch = false;
                                        
                                        if (content.picture && content.picture.length) postr_profile_update.picture = content.picture;
                                        if (content.username && content.username.length) postr_profile_update.name = content.username;
                                        if (content.displayName && content.displayName.length) postr_profile_update.name = content.displayName;
                                        if (content.display_name && content.display_name.length) postr_profile_update.name = content.display_name;
                                        
                                        set_postr_profile(postr_profile_update);
                                    } catch (e) {
                                        console.error('Error parsing profile metadata:', e);
                                    }
                                }
                                
                                // Handle relay list (kind 10002)
                                if (event.kind === 10002) {
                                    // console.log('Received relay list event (kind 10002):', event);
                                    try {
                                        const relayList = {};
                                        event.tags.forEach(tag => {
                                            if (tag[0] === 'r' && tag[1] && tag[1] !== '') {
                                                relayList[tag[1]] = { read: true, write: true };
                                                if (tag[2] && !tag[3] && tag[2] === 'read') { // only read
                                                    relayList[tag[1]].write = false;
                                                }
                                                if (tag[2] && !tag[3] && tag[2] === 'write') { // only write
                                                    relayList[tag[1]].read = false;
                                                }
                                            }
                                        });
                                        if (Object.keys(relayList).length > 0) {
                                            set_relays(relayList);
                                        }
                                    } catch (e) {
                                        console.error('Error parsing relay list:', e);
                                    }
                                }
                            },
                            oneose() {
                                console.log('EOSE: Completed initial relay sync');
                            }
                        }
                    );
                    
                    return subscription;
                } catch (error) {
                    console.error('Error connecting to relays:', error);
                    return null;
                }
            };

            getProfileAndRelays(relays);
        }
    }, [public_key_hex]);

    //console.log('tt', postr_profile, relays);

    // after initializing prepare postr data
    const [postr_note, set_postr_note] = useState('');
    const [postr_tags, set_postr_tags] = useState({ total: 0, list: [] });
    useEffect(() => {
        if (!initializing) {
            let tag_total = 0;
            Object.keys(post_data.data.taxonomies).map(tax => {
                tag_total += Object.keys(post_data.data.taxonomies[tax].terms).length;
            })
            set_postr_tags({ ...postr_tags, total: tag_total });
            let postr_note = `${post_data.data.title}\n\n`;
            if (post_data.data.excerpt.length) postr_note += `${post_data.data.excerpt}\n\n`;
            postr_note += post_data.data.permalink;
            set_postr_note(postr_note);
        };
    }, [initializing]);

    const StateIndicator = (props) => {
        return <Fragment>
            <div className="postr-for-nostr-app__state-loader">
                {!props.state
                    ? <div class="postr-for-nostr-app__spinner"><div></div><div></div><div></div><div></div></div>
                    : props.state.status ? '✅' : '❌'}
            </div>
            {false === props.state || props.state.status ? props.task : props.state.data}
        </Fragment>;
    }
    const Initialize = (props) => {
        return <div className="postr-for-nostr-app__verify-nip07">
            <ul className="postr-for-nostr-app__state-indicator-list">
                <li><StateIndicator state={nip07} task={_x('Looking for NIP-07 extension', 'component initalize task', 'postr-for-nostr')} /></li>
                <li><StateIndicator state={post_data} task={_x('Verifying post data', 'component initalize task', 'postr-for-nostr')} /></li>
                <li><StateIndicator state={public_key_hex} task={_x('Retrieving public key', 'component initalize task', 'postr-for-nostr')} /></li>
            </ul>
        </div>;
    }

    // state variable to toggle relay visibility
    const [relays_visible, set_relays_visible] = useState(false);
    const RelayList = (props) => {
        const [add_valid, set_add_valid] = useState(false);
        const [add_value, set_add_value] = useState('');

        const on_add_relay = () => {
            let relays_update = Object.assign({}, relays);
            relays_update[add_value] = { read: true, write: true };
            set_relays(relays_update);
        }

        return (
            <div className="postr-for-nostr-app__postr-relays">
                {relays && <button type="button" className="postr-for-nostr-app__postr-relays-toggle" onClick={() => set_relays_visible(!relays_visible)}>
                    <span className="postr-for-nostr-app__postr-relays-toggle-title">{Object.keys(relays).length + ' Relays'}</span>
                    <span className="postr-for-nostr-app__postr-relays-toggle-horizontal">
                        <span className="postr-for-nostr-app__postr-relays-toggle-line"></span>
                        {relays_visible && <span class="dashicons dashicons-arrow-down-alt2"></span>}
                        {!relays_visible && <span class="dashicons dashicons-arrow-up-alt2"></span>}
                    </span>
                </button>}
                {relays && relays_visible && <ul className="postr-for-nostr-app__postr-relays">
                    {Object.keys(relays).map((rkey) => {
                        if (rkey.length && relays[rkey].write) {
                            return <li key={rkey}>
                                <span className="postr-for-nostr-app__postr-relay-label">{rkey}</span>
                                <button title={'Remove Relay'} type="button" onClick={() => {
                                    let relays_update = Object.assign({}, relays);
                                    delete relays_update[rkey];
                                    set_relays(relays_update);
                                }}><span className="dashicons dashicons-remove"></span></button>
                            </li>
                        }
                    })}
                    <li class="postr-for-nostr-app__postr-relay-add">
                        <input placeholder="Add relay …" value={add_value} className='postr-for-nostr-app__postr-relay-label' onChange={(event) => {
                            let valid = validate_websocket_url(event.target.value);
                            if (valid) set_add_valid(true);
                            else set_add_valid(false);
                            set_add_value(event.target.value);
                        }} onKeyDown={(event) => {
                            if (event.key == 'Enter') {
                                event.preventDefault();
                                if (add_valid) {
                                    on_add_relay();
                                }
                            }
                        }}></input>
                        <button
                            title={_x('Add Relay', 'relays component button label', 'postr-for-nostr')}
                            type="button"
                            disabled={add_valid ? false : true}
                            onClick={on_add_relay}>
                            {add_valid ? <span class="dashicons dashicons-insert"></span> : <span class="dashicons dashicons-info-outline"></span>}
                        </button>
                    </li>
                </ul>}
            </div>
        )
    }

    // state variable to toggle tags visibility
    const [tags_visible, set_tags_visible] = useState(false);
    const TagList = (props) => {
        const [add_valid, set_add_valid] = useState(false);
        const [add_value, set_add_value] = useState('');

        const on_add_tag = () => {
            if (!postr_tags.list['custom-' + add_value.toLowerCase()]) {
                let postr_tags_update = Object.assign({}, postr_tags);
                postr_tags_update.list['custom-' + add_value.toLowerCase()] = add_value;
                let tag_total = 0;
                Object.keys(post_data.data.taxonomies).map(tax => {
                    tag_total += Object.keys(post_data.data.taxonomies[tax].terms).length;
                });
                Object.keys(postr_tags_update.list).map(tkey => {
                    if (tkey.startsWith('custom-')) {
                        tag_total++;
                    }
                })
                postr_tags_update.total = tag_total;
                set_postr_tags(postr_tags_update);
            }
        }

        return (
            <div className="postr-for-nostr-app__postr-tags">
                {postr_tags && <button type="button" className="postr-for-nostr-app__postr-tags-toggle" onClick={() => set_tags_visible(!tags_visible)}>
                    <span className="postr-for-nostr-app__postr-tags-toggle-title">{Object.keys(postr_tags.list).length + '/' + postr_tags.total + ' Tags'}</span>
                    <span className="postr-for-nostr-app__postr-tags-toggle-horizontal">
                        <span className="postr-for-nostr-app__postr-tags-toggle-line"></span>
                        {tags_visible && <span class="dashicons dashicons-arrow-down-alt2"></span>}
                        {!tags_visible && <span class="dashicons dashicons-arrow-up-alt2"></span>}
                    </span>
                </button>}
                {postr_tags && tags_visible && <Fragment>
                    <p className="postr-for-nostr-app__postr-tag-notice"><i>{_x('These tags are added as type t tags in the Nostr event object.', 'tags component notice', 'postr-for-nostr')}</i></p>
                    <div className="postr-for-nostr-app__postr-tag-types">
                        {Object.keys(post_data.data.taxonomies).map(tax => {
                            if (Object.keys(post_data.data.taxonomies[tax].terms).length) {
                                return (<div>
                                    <h5>{post_data.data.taxonomies[tax].name}</h5>
                                    <ul>{Object.keys(post_data.data.taxonomies[tax].terms).map(term => {
                                        const tag_key = tax + '-' + term;
                                        return (<li><label><input type="checkbox" checked={postr_tags.list[tag_key]} value={tag_key} onClick={() => {
                                            let postr_tags_update = Object.assign({}, postr_tags);
                                            if (postr_tags_update.list[tag_key]) {
                                                delete postr_tags_update.list[tag_key];
                                            } else {
                                                postr_tags_update.list[tag_key] = post_data.data.taxonomies[tax].terms[term];
                                            }
                                            set_postr_tags(postr_tags_update);
                                        }} />{post_data.data.taxonomies[tax].terms[term]}</label></li>)
                                    })}</ul>
                                </div>)
                            }
                        })}
                        <div className="postr-for-nostr-app__postr-tags-custom">
                            <h5>{_x('Add custom tags', 'tags component title', 'postr-for-nostr')}</h5>
                            <ul>
                                {Object.keys(postr_tags.list).map(tkey => {
                                    if (tkey.startsWith('custom-')) {
                                        return <li key={tkey}>
                                            <span className="postr-for-nostr-app__postr-tag-label">{postr_tags.list[tkey]}</span>
                                            <button title={'Remove Tag'} type="button" onClick={() => {
                                                let postr_tags_update = Object.assign({}, postr_tags);
                                                delete postr_tags_update.list[tkey];
                                                set_postr_tags(postr_tags_update);
                                            }}><span className="dashicons dashicons-remove"></span></button>
                                        </li>
                                    }
                                })}
                                <li class="postr-for-nostr-app__postr-tag-add">
                                    <input placeholder="Add tag …" value={add_value} className='postr-for-nostr-app__postr-tag-label' onChange={(event) => {
                                        let valid = validate_tag(event.target.value) || postr_tags.list['custom-' + event.target.value.toLowerCase()];
                                        if (valid) set_add_valid(true);
                                        else set_add_valid(false);
                                        set_add_value(event.target.value);
                                    }} onKeyDown={(event) => {
                                        if (event.key == 'Enter') {
                                            event.preventDefault();
                                            if (add_valid) {
                                                on_add_tag();
                                            }
                                        }
                                    }}></input>
                                    <button
                                        title={_x('Add tag', 'tags component button label', 'postr-for-nostr')}
                                        disabled={add_valid && 'undefined' === typeof postr_tags.list['custom-' + add_value.toLowerCase()] ? false : true}
                                        type="button"
                                        onClick={on_add_tag}>
                                        {add_valid ? <span class="dashicons dashicons-insert"></span> : <span class="dashicons dashicons-info-outline"></span>}
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </Fragment>}
            </div>
        )
    }

    // state variable to show status of transmitting event to nostr
    const [postring, set_postring] = useState(false);
    const on_postr = (e) => {
        e.preventDefault();
        set_postring(true);
        // send false to not reload the page on form submit
        return false;
    }

    const Postr = () => {
        return <div className="postr-for-nostr-app__postr">
            <h2 className="postr-for-nostr-app__postr-title">{_x('Postr For Nostr', 'form component title', 'postr-for-nostr')}</h2>
            {!postring && <Form />}
            {postring && <Postring />}
        </div>;
    }
    const Form = () => {
        return <form className={"postr-for-nostr-app__postr-form"} onSubmit={on_postr}>
            <fieldset className="postr-for-nostr-app__postr-profile">
                <label><strong>{_x('Profile', 'form component label', 'postr-for-nostr')}</strong></label>
                <div>
                    <figure>
                        {postr_profile.picture && <img src={postr_profile.picture} alt={_x('Profile image', 'form component image alt title', 'postr-for-nostr')} />}
                    </figure>
                    <p>
                        <strong>{postr_profile.name}</strong>
                        <span>{shorten_string(postr_profile.npub)}</span>
                    </p>
                </div>
            </fieldset>
            <fieldset>
                <label><strong>{_x('Note', 'form component label', 'postr-for-nostr')}</strong></label>
                <div>
                    <textarea
                        name="note"
                        defaultValue={postr_note}
                        placeholder={_x('Write notes and other stuff…', 'form component textare placeholder', 'postr-for-nostr')}
                        rows={6}
                        onBlur={(event) => {
                            let value_update = event.target.value;
                            set_postr_note(value_update);
                        }}
                    />
                    <ul>{Object.keys(postr_tags.list).map(tkey => <li>{'#' + postr_tags.list[tkey]}</li>)}</ul>
                </div>
            </fieldset>
            <fieldset>
                <label><strong>{_x('Tags', 'form component label', 'postr-for-nostr')}</strong></label>
                <div><TagList /></div>
            </fieldset>
            <fieldset>
                <label><strong>{_x('Relays', 'form component label', 'postr-for-nostr')}</strong></label>
                <div><RelayList /></div>
            </fieldset>
            <fieldset className="postr-for-nostr-app__postr-actions">
                <label><strong>{_x('Form Actions', 'form component label', 'postr-for-nostr')}</strong></label>
                <div>
                    <button type="submit" className={'button button-primary'}>{_x('Transmit to Nostr', 'form component button label', 'postr-for-nostr')}</button>
                </div>
            </fieldset>
        </form>
    }
    const Postring = () => {
        const [event, set_event] = useState(false);
        const [postring_error, set_postring_error] = useState([]);
        const [subs, set_subs] = useState(relays);

        useEffect(() => {
            let event = {
                kind: 1,
                pubkey: public_key_hex.data,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: postr_note
            }
            for (const property in postr_tags.list) {
                event.tags.push(['t', postr_tags.list[property]]);
            }
            event.id = nostr_tools.getEventHash(event);

            // console.log('event ready to send', event);
            window.nostr.signEvent(event).then((event) => {
                let subs_update = {};
                Object.keys(relays).map(async (relay) => {
                    subs_update = { ...subs };
                    subs_update[relay].init = nostr_tools.relayInit(relay);
                    subs_update[relay].init.on('error', () => {
                        subs_update = { ...subs };
                        subs_update[relay].success = false;
                        set_subs(subs_update);
                    })
                    try {
                        await subs_update[relay].init.connect();
                    } catch (error) {
                        // silence
                    }
                    subs_update[relay].pub = subs_update[relay].init.publish(event);
                    subs_update[relay].pub.on('ok', () => {
                        subs_update = { ...subs };
                        subs_update[relay].success = true;
                        set_subs(subs_update);
                    })
                    subs_update[relay].pub.on('failed', reason => {
                        subs_update = { ...subs };
                        subs_update[relay].success = false;
                        set_subs(subs_update);
                    })
                });
                set_event(event);
                set_subs(subs_update);
            }).catch((error) => {
                set_postring_error([
                    ...postring_error,
                    {
                        title: _x('Event could not be signed', 'postring component error', 'postr-for-nostr'),
                        message: error.message
                    }
                ]);
            })
        }, []);

        // console.log(subs);

        return <div className={"postr-for-nostr-app__postring"}>
            {!postring_error.length && <div className="postr-for-nostr-app__postring-status">
                <div><strong>{_x('Event ID', 'postring component title', 'postr-for-nostr')}</strong><br />{event ? event.id : <div class="postr-for-nostr-app__spinner"><div></div><div></div><div></div><div></div></div>}</div>
                <ul>
                    {Object.keys(relays).map((relay) => {
                        return <li>
                            {'undefined' === typeof subs[relay].success ? <div class="postr-for-nostr-app__spinner"><div></div><div></div><div></div><div></div></div> : subs[relay].success ? <div>✅</div> : <div>❌</div>}
                            <strong>{relay}</strong>
                        </li>
                    })}
                </ul>
            </div>}
            {!!postring_error.length && <div className="postr-for-nostr-app__postring-errors">
                <span>&#128683;</span>
                <h3>{_x('Failed to postr for the following reasons:', 'postring component error', 'postr-for-nostr')}</h3>
                <ul>
                    {postring_error.map((error) => {
                        return <li><strong>{error.title}</strong><br />{error.message}</li>
                    })}
                </ul>
                <button type="button" onClick={() => {
                    window.location.reload();
                }}>{_x('Reload and try again', 'postring component button label', 'postr-for-nostr')}</button>
            </div>}
        </div>
    }

    return (<Fragment>
        {initializing && <Initialize />}
        {!initializing && <Postr />}
    </Fragment>);
}

// used to shorten the npub like npubxxxx:xxxxxxxx
function shorten_string(string) {
    let shortened = string.substring(0, 8);
    shortened += ':';
    shortened += string.substring(string.length - 8);
    return shortened;
}

// validate websocket url in the RelayList component
function validate_websocket_url(url) {
    const regex = /^wss:\/\/[^\/]{2,}\.[^\/]{2,}.*$/;
    return regex.test(url);
}

// validate tag in the TagList component
function validate_tag(tag) {
    const regex = /^[a-zA-Z0-9]+$/;
    return regex.test(tag);
}