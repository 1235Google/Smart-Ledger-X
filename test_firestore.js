fetch('https://firestore.googleapis.com/v1/projects/studio-3200340687-9f052/databases/(default)/documents/missing_collection/missing_doc', {
    method: 'PATCH',
    body: JSON.stringify({ fields: { a: { stringValue: 'b' } } })
}).then(res => res.text()).then(console.log);
