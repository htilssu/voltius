//! Private-key decoding that tolerates BER-encoded PKCS#1 RSA keys.
//!
//! russh parses `-----BEGIN RSA PRIVATE KEY-----` with the strict `der` crate,
//! which rejects encodings OpenSSH/OpenSSL accept: long-form lengths that use
//! more octets than needed (`82 00 81` instead of `81 81`), redundant leading
//! zeroes, or a missing `00` pad on an integer whose top bit is set. Some key
//! generators emit exactly that, and the user sees
//! "PKCS#1 ASN.1 error: incorrect length for INTEGER". When the strict parse
//! fails we re-encode the DER canonically and try once more.

use base64::{engine::general_purpose::STANDARD, Engine};
use russh::keys::{Error, PrivateKey};

const RSA_BEGIN: &str = "-----BEGIN RSA PRIVATE KEY-----";
const RSA_END: &str = "-----END RSA PRIVATE KEY-----";
const TAG_INTEGER: u8 = 0x02;
const TAG_SEQUENCE: u8 = 0x30;

pub fn decode_secret_key(text: &str, passphrase: Option<&str>) -> Result<PrivateKey, Error> {
    russh::keys::decode_secret_key(text, passphrase).or_else(|err| {
        canonical_rsa_pem(text)
            .and_then(|pem| russh::keys::decode_secret_key(&pem, passphrase).ok())
            .ok_or(err)
    })
}

/// The same key with its DER re-encoded canonically, or `None` when it is not
/// an unencrypted PKCS#1 PEM, does not parse even leniently, or is already canonical.
fn canonical_rsa_pem(text: &str) -> Option<String> {
    let mut lines = text.trim().lines().map(str::trim);
    if lines.next()? != RSA_BEGIN {
        return None;
    }
    let mut body = String::new();
    for line in lines.by_ref() {
        if line == RSA_END {
            break;
        }
        // `Proc-Type`/`DEK-Info` headers mean the DER is encrypted; leave it to russh.
        if line.contains(':') {
            return None;
        }
        body.push_str(line);
    }
    let der = STANDARD.decode(body).ok()?;
    let fixed = canonicalize(&der)?;
    (fixed != der).then(|| rsa_pem(&fixed))
}

fn rsa_pem(der: &[u8]) -> String {
    let b64 = STANDARD.encode(der);
    let lines: Vec<&str> = b64
        .as_bytes()
        .chunks(64)
        .map(|c| std::str::from_utf8(c).expect("base64 is ASCII"))
        .collect();
    format!("{RSA_BEGIN}\n{}\n{RSA_END}\n", lines.join("\n"))
}

/// Re-encodes a run of TLVs with minimal lengths, recursing into SEQUENCEs.
/// INTEGERs are treated as unsigned, which holds for every field of an RSA key.
fn canonicalize(mut input: &[u8]) -> Option<Vec<u8>> {
    let mut out = Vec::with_capacity(input.len());
    while !input.is_empty() {
        let (tag, value, rest) = read_tlv(input)?;
        input = rest;
        let value = match tag {
            TAG_SEQUENCE => canonicalize(value)?,
            TAG_INTEGER => unsigned_integer(value),
            _ => value.to_vec(),
        };
        write_tlv(&mut out, tag, &value);
    }
    Some(out)
}

fn read_tlv(input: &[u8]) -> Option<(u8, &[u8], &[u8])> {
    let (&tag, rest) = input.split_first()?;
    let (&first, mut rest) = rest.split_first()?;
    let len = if first < 0x80 {
        usize::from(first)
    } else {
        // 0x80 alone is BER's indefinite length, which no key generator uses.
        let n = usize::from(first & 0x7f);
        if n == 0 || n > 4 {
            return None;
        }
        let (octets, tail) = rest.split_at_checked(n)?;
        rest = tail;
        octets
            .iter()
            .fold(0usize, |acc, &b| acc << 8 | usize::from(b))
    };
    let (value, rest) = rest.split_at_checked(len)?;
    Some((tag, value, rest))
}

fn unsigned_integer(value: &[u8]) -> Vec<u8> {
    let digits = value
        .iter()
        .position(|&b| b != 0)
        .map_or(&[0u8][..], |i| &value[i..]);
    let mut out = Vec::with_capacity(digits.len() + 1);
    if digits[0] >= 0x80 {
        out.push(0);
    }
    out.extend_from_slice(digits);
    out
}

fn write_tlv(out: &mut Vec<u8>, tag: u8, value: &[u8]) {
    out.push(tag);
    let len = value.len();
    if len < 0x80 {
        out.push(len as u8);
    } else {
        let octets = len.to_be_bytes();
        let skip = octets.iter().take_while(|&&b| b == 0).count();
        out.push(0x80 | (octets.len() - skip) as u8);
        out.extend_from_slice(&octets[skip..]);
    }
    out.extend_from_slice(value);
}

#[cfg(test)]
mod tests {
    use super::*;
    use rsa::pkcs1::EncodeRsaPrivateKey;

    /// Re-encodes like the generators that trip russh: every long-form length
    /// padded to two octets, and a redundant leading zero on small integers.
    fn sloppy_ber(mut input: &[u8]) -> Vec<u8> {
        let mut out = Vec::new();
        while !input.is_empty() {
            let (tag, value, rest) = read_tlv(input).unwrap();
            input = rest;
            let value = match tag {
                TAG_SEQUENCE => sloppy_ber(value),
                TAG_INTEGER if value.len() < 8 => [&[0u8][..], value].concat(),
                _ => value.to_vec(),
            };
            out.push(tag);
            if value.len() < 0x80 {
                out.push(value.len() as u8);
            } else {
                out.push(0x82);
                out.extend_from_slice(&(value.len() as u16).to_be_bytes());
            }
            out.extend_from_slice(&value);
        }
        out
    }

    #[test]
    fn ber_encoded_pkcs1_rsa_key_decodes() {
        let key = rsa::RsaPrivateKey::new(&mut rand::thread_rng(), 2048).unwrap();
        let der = key.to_pkcs1_der().unwrap().as_bytes().to_vec();
        let ber = sloppy_ber(&der);
        assert_ne!(ber, der);
        assert_eq!(canonicalize(&ber).unwrap(), der);

        let sloppy = rsa_pem(&ber);
        assert!(russh::keys::decode_secret_key(&sloppy, None).is_err());
        let decoded = decode_secret_key(&sloppy, None).unwrap();
        let strict = russh::keys::decode_secret_key(&rsa_pem(&der), None).unwrap();
        assert_eq!(decoded.public_key(), strict.public_key());
    }

    #[test]
    fn leaves_canonical_and_encrypted_keys_alone() {
        assert_eq!(
            canonicalize(&[0x02, 0x01, 0x05]).unwrap(),
            [0x02, 0x01, 0x05]
        );
        assert!(canonical_rsa_pem(&rsa_pem(&[0x30, 0x03, 0x02, 0x01, 0x05])).is_none());
        let encrypted = "-----BEGIN RSA PRIVATE KEY-----\nProc-Type: 4,ENCRYPTED\nDEK-Info: AES-128-CBC,00FF\n\nMIIEow==\n-----END RSA PRIVATE KEY-----\n";
        assert!(canonical_rsa_pem(encrypted).is_none());
    }
}
