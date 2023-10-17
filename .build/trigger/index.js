// query postr for nostr trigger elements
const postr_for_nostr_trigger_elements = document.querySelectorAll('.postr-for-nostr');

// initialize trigger elements
[...postr_for_nostr_trigger_elements].map((element) => {
    element.addEventListener('click', function () {
        const id = element.getAttribute('data-post-id');
        const type = element.getAttribute('data-post-type');
        window.open(window.location.origin + '?action=postr-for-nostr&post_id=' + id + '&post_type=' + type, 'targetWindow', 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=700');
        return false;
    });
});