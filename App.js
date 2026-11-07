import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { addBook, createOrder, deleteBook, getBooks, updateBook } from './src/services/booksApi';
import { API_BASE_URL, isApiConfigured } from './src/services/apiConfig';

const categories = ['Të gjithë', 'Roman', 'Shkencë', 'Fëmijë', 'Histori'];

const money = (value) => `${Number(value).toFixed(2)} €`;

export default function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Të gjithë');
  const [selectedBook, setSelectedBook] = useState(null);
  const [formBook, setFormBook] = useState(null);
  const [checkoutBook, setCheckoutBook] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    getBooks()
      .then((loadedBooks) => {
        setBooks(loadedBooks);
        setLoadError('');
      })
      .catch((error) => {
        setBooks([]);
        setLoadError(error.message || 'Kontrollo lidhjen me serverin PHP/MySQL.');
      })
      .finally(() => setLoading(false));
  }, [reloadKey]);

  const visibleBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return books.filter((book) => {
      const matchesCategory = category === 'Të gjithë' || book.category === category;
      const matchesQuery = !normalizedQuery
        || `${book.title} ${book.author}`.toLocaleLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [books, category, query]);

  const saveBook = async (values) => {
    try {
      const savedBook = values.id
        ? await updateBook(values.id, values)
        : await addBook(values);
      setBooks((current) => values.id
        ? current.map((book) => (book.id === savedBook.id ? savedBook : book))
        : [savedBook, ...current]);
      setFormBook(null);
      showNotice(values.id ? 'Libri u përditësua.' : 'Libri u shtua në katalog.');
    } catch (error) {
      Alert.alert('Libri nuk u ruajt', error.message);
    }
  };

  const removeBook = (book) => {
    Alert.alert('Fshi librin?', `“${book.title}” do të hiqet nga katalogu.`, [
      { text: 'Anulo', style: 'cancel' },
      {
        text: 'Fshi',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBook(book.id);
            setBooks((current) => current.filter((item) => item.id !== book.id));
            if (selectedBook?.id === book.id) setSelectedBook(null);
            showNotice('Libri u fshi.');
          } catch (error) {
            Alert.alert('Libri nuk u fshi', error.message);
          }
        },
      },
    ]);
  };

  const startPurchase = (book) => {
    setSelectedBook(null);
    setCheckoutBook(book);
  };

  const submitPurchase = async (values) => {
    const result = await createOrder({
      bookId: checkoutBook.id,
      quantity: values.quantity,
      customer: values.customer,
    });
    setBooks((current) => current.map((book) => (book.id === result.book.id ? result.book : book)));
    return result;
  };

  const showNotice = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 2600);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.paper} />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>B</Text></View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>BIBLIOTEKA</Text>
            <Text style={styles.brandSub}>ONLINE · KATALOGU</Text>
          </View>
          <Pressable
            disabled={loading || !!loadError}
            style={[styles.addButton, (loading || loadError) && styles.addButtonDisabled]}
            onPress={() => setFormBook({})}
            accessibilityLabel="Shto libër"
          >
            <Text style={styles.addButtonText}>＋</Text>
          </Pressable>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>LEXO MË SHUMË</Text>
          <Text style={styles.heading}>Një libër i mirë{ '\n' }të pret këtu.</Text>
          <View style={styles.introFoot}>
            <Text style={styles.introCaption}>Zbulo diçka të re për veten.</Text>
            <Text style={styles.bookCount}>{books.length.toString().padStart(2, '0')} LIBRA</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            accessibilityLabel="Kërko libra"
            placeholder="Kërko titull ose autor"
            placeholderTextColor={COLORS.muted}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Pastro kërkimin">
              <Text style={styles.clearSearch}>×</Text>
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {categories.map((item) => (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[styles.categoryChip, category === item && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Katalogu</Text>
          <Text style={styles.resultCount}>{visibleBooks.length} rezultate</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.green} style={styles.loader} />
        ) : loadError ? (
          <View style={styles.connectionError}>
            <Text style={styles.connectionErrorTitle}>Nuk lidhem me bibliotekën.</Text>
            <Text style={styles.connectionErrorMessage}>{loadError}</Text>
            <Text style={styles.connectionErrorHint}>API: {API_BASE_URL || 'EXPO_PUBLIC_API_URL nuk është vendosur'}</Text>
            <Text style={styles.connectionErrorHint}>Telefoni dhe kompjuteri duhet të jenë në të njëjtin Wi-Fi. Lejo Apache në Windows Firewall.</Text>
            <Pressable onPress={() => setReloadKey((current) => current + 1)} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Provo përsëri</Text>
              <Text style={styles.buyButtonArrow}>↻</Text>
            </Pressable>
          </View>
        ) : visibleBooks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Asnjë libër këtu.</Text>
            <Text style={styles.emptyCopy}>Ndrysho kërkimin ose shto një libër të ri.</Text>
          </View>
        ) : (
          <View style={styles.bookList}>
            {visibleBooks.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                onOpen={() => setSelectedBook(book)}
                onEdit={() => setFormBook(book)}
                onDelete={() => removeBook(book)}
              />
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerRule} />
          <Text style={styles.footerText}>PROJEKT EDUKATIV · TË DHËNAT RUHEN NË MYSQL</Text>
        </View>
      </ScrollView>

      {!!notice && <Text style={styles.notice}>{notice}</Text>}

      <BookDetailsModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onBuy={startPurchase}
      />
      <BookFormModal
        book={formBook}
        onClose={() => setFormBook(null)}
        onSave={saveBook}
      />
      <CheckoutModal
        book={checkoutBook}
        onClose={() => setCheckoutBook(null)}
        onSubmit={submitPurchase}
        isConnectedToDatabase={isApiConfigured}
      />
    </SafeAreaView>
  );
}

const COLORS = {
  paper: '#f4f3ec',
  white: '#fffefa',
  ink: '#202b26',
  green: '#315f4c',
  greenLight: '#dce8df',
  coral: '#dd795e',
  muted: '#858a81',
  line: '#e5e4dc',
};

function BookRow({ book, onOpen, onEdit, onDelete }) {
  return (
    <View style={styles.bookRow}>
      <Pressable onPress={onOpen} style={styles.bookMain}>
        <BookCover book={book} compact />
        <View style={styles.bookInfo}>
          <Text style={styles.bookCategory}>{book.category.toLocaleUpperCase()}</Text>
          <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>{book.author}</Text>
          <View style={styles.bookMeta}>
            <Text style={styles.bookPrice}>{money(book.price)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={[styles.stockText, book.stock < 4 && styles.lowStock]}>{book.stock} në stok</Text>
          </View>
        </View>
        <Text style={styles.openArrow}>›</Text>
      </Pressable>
      <View style={styles.rowActions}>
        <Pressable onPress={onEdit} style={styles.rowAction} accessibilityLabel={`Edito ${book.title}`}>
          <Text style={styles.rowActionText}>✎  Edito</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable onPress={onDelete} style={styles.rowAction} accessibilityLabel={`Fshi ${book.title}`}>
          <Text style={[styles.rowActionText, styles.deleteText]}>Fshi  ×</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BookCover({ book, compact = false }) {
  return (
    <View style={[styles.cover, { backgroundColor: book.coverColor }, compact && styles.coverCompact]}>
      <View style={styles.coverLine} />
      <View style={styles.coverTextWrap}>
        <Text style={[styles.coverTitle, compact && styles.coverTitleCompact]} numberOfLines={3}>{book.title}</Text>
        {!compact && <Text style={styles.coverAuthor}>{book.author}</Text>}
      </View>
      <View style={styles.coverSeal}><Text style={styles.coverSealText}>B</Text></View>
    </View>
  );
}

function BookDetailsModal({ book, onClose, onBuy }) {
  if (!book) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.detailsSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.detailsTop}>
            <BookCover book={book} />
            <View style={styles.detailsInfo}>
              <Text style={styles.bookCategory}>{book.category.toLocaleUpperCase()}</Text>
              <Text style={styles.detailsTitle}>{book.title}</Text>
              <Text style={styles.bookAuthor}>{book.author}</Text>
              <Text style={styles.detailsPrice}>{money(book.price)}</Text>
              <Text style={styles.stockText}>{book.stock} kopje në stok</Text>
            </View>
          </View>
          <Text style={styles.descriptionLabel}>PËR LIBRIN</Text>
          <Text style={styles.description}>{book.description || 'Përshkrimi do të shtohet së shpejti.'}</Text>
          <Pressable
            disabled={book.stock < 1}
            onPress={() => onBuy(book)}
            style={[styles.buyButton, book.stock < 1 && styles.buyButtonDisabled]}
          >
            <Text style={styles.buyButtonText}>{book.stock < 1 ? 'Nuk ka në stok' : 'Bli librin'}</Text>
            <Text style={styles.buyButtonArrow}>→</Text>
          </Pressable>
          <Text style={styles.demoNote}>Zgjidh sasinë dhe plotëso të dhënat e porosisë në hapin tjetër.</Text>
        </View>
      </View>
    </Modal>
  );
}

function BookFormModal({ book, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Roman');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (book) {
      setTitle(book.title || '');
      setAuthor(book.author || '');
      setCategory(book.category || 'Roman');
      setPrice(book.price === undefined ? '' : String(book.price));
      setStock(book.stock === undefined ? '' : String(book.stock));
      setDescription(book.description || '');
      setError('');
    }
  }, [book]);

  const submit = () => {
    if (!title.trim() || !author.trim() || !price.trim() || !stock.trim()
      || !Number.isFinite(Number(price)) || Number(price) <= 0
      || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
      setError('Plotëso titullin, autorin, çmimin dhe stokun saktë.');
      return;
    }
    onSave({
      ...(book?.id ? { id: book.id } : {}),
      title: title.trim(),
      author: author.trim(),
      category,
      price: Number(price),
      stock: Number(stock),
      description: description.trim(),
    });
  };

  return (
    <Modal visible={!!book} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.formSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.formHeadingRow}>
            <View>
              <Text style={styles.eyebrow}>{book?.id ? 'PËRDITËSO KATALOGUN' : 'ZGJERO KATALOGUN'}</Text>
              <Text style={styles.formTitle}>{book?.id ? 'Edito librin' : 'Shto libër'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Mbyll">
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <FormField label="TITULLI" value={title} onChangeText={setTitle} placeholder="p.sh. Emri i trëndafilit" />
            <FormField label="AUTORI" value={author} onChangeText={setAuthor} placeholder="Emri i autorit" />
            <Text style={styles.fieldLabel}>KATEGORIA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formCategories}>
              {categories.slice(1).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[styles.formCategory, category === item && styles.formCategoryActive]}
                >
                  <Text style={[styles.formCategoryText, category === item && styles.formCategoryTextActive]}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.numberFields}>
              <View style={styles.numberField}>
                <FormField label="ÇMIMI (€)" value={price} onChangeText={setPrice} placeholder="12.50" keyboardType="decimal-pad" />
              </View>
              <View style={styles.numberField}>
                <FormField label="STOKU" value={stock} onChangeText={setStock} placeholder="10" keyboardType="number-pad" />
              </View>
            </View>
            <FormField label="PËRSHKRIMI" value={description} onChangeText={setDescription} placeholder="Pak fjalë për librin..." multiline />
            {!!error && <Text style={styles.formError}>{error}</Text>}
            <Pressable onPress={submit} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>{book?.id ? 'Ruaj ndryshimet' : 'Shto në katalog'}</Text>
              <Text style={styles.buyButtonArrow}>→</Text>
            </Pressable>
            <View style={styles.formBottomSpace} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CheckoutModal({ book, onClose, onSubmit, isConnectedToDatabase }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setQuantity(1);
    setSubmitting(false);
    setError('');
    setReceipt(null);
  }, [book]);

  if (!book) return null;

  const total = Number((Number(book.price) * quantity).toFixed(2));

  const placeOrder = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      setError('Plotëso emrin, email-in, telefonin dhe adresën.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Shkruaj një adresë email-i të vlefshme.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await onSubmit({
        quantity,
        customer: { name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim() },
      });
      setReceipt(result.order);
    } catch (submitError) {
      setError(submitError.message || 'Porosia nuk u regjistrua. Provo përsëri.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent={false} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.checkoutPage}>
        <ExpoStatusBar style="dark" />
        <View style={styles.checkoutHeader}>
          <Pressable onPress={onClose} style={styles.checkoutBack} accessibilityLabel="Kthehu te librat">
            <Text style={styles.checkoutBackText}>‹</Text>
          </Pressable>
          <View style={styles.checkoutHeaderCopy}>
            <Text style={styles.brandName}>BIBLIOTEKA</Text>
            <Text style={styles.brandSub}>POROSIA JOTE</Text>
          </View>
          <View style={styles.checkoutStep}><Text style={styles.checkoutStepText}>01 / 01</Text></View>
        </View>

        {receipt ? (
          <View style={styles.receiptPage}>
            <View style={styles.receiptMark}><Text style={styles.receiptMarkText}>✓</Text></View>
            <Text style={styles.eyebrow}>POROSI NË MYSQL</Text>
            <Text style={styles.receiptTitle}>Faleminderit,{ '\n' }{name.split(' ')[0]}.</Text>
            <Text style={styles.receiptCopy}>Porosia u ruajt në databazën MySQL dhe stoku u përditësua.</Text>
            <View style={styles.receiptDetails}>
              <View style={styles.receiptLine}><Text style={styles.receiptLabel}>NUMRI I POROSISË</Text><Text style={styles.receiptValue}>#{receipt.id}</Text></View>
              <View style={styles.receiptLine}><Text style={styles.receiptLabel}>LIBRI</Text><Text style={styles.receiptValue} numberOfLines={1}>{book.title}</Text></View>
              <View style={styles.receiptLine}><Text style={styles.receiptLabel}>SASIA</Text><Text style={styles.receiptValue}>{receipt.quantity}</Text></View>
              <View style={[styles.receiptLine, styles.receiptTotal]}><Text style={styles.receiptTotalLabel}>TOTALI</Text><Text style={styles.receiptTotalValue}>{money(receipt.total)}</Text></View>
            </View>
            <Pressable onPress={onClose} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Kthehu te katalogu</Text>
              <Text style={styles.buyButtonArrow}>→</Text>
            </Pressable>
          </View>
        ) : (
          <KeyboardAvoidingView style={styles.checkoutBody} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.checkoutContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.eyebrow}>NJË HAP DREJT LEXIMIT TË RI</Text>
              <Text style={styles.checkoutTitle}>Përfundo{ '\n' }porosinë.</Text>

              <View style={styles.checkoutBook}>
                <BookCover book={book} compact />
                <View style={styles.checkoutBookInfo}>
                  <Text style={styles.bookCategory}>{book.category.toLocaleUpperCase()}</Text>
                  <Text style={styles.checkoutBookTitle} numberOfLines={2}>{book.title}</Text>
                  <Text style={styles.bookAuthor}>{book.author}</Text>
                  <Text style={styles.checkoutUnitPrice}>{money(book.price)} / libër</Text>
                </View>
              </View>

              <View style={styles.checkoutQuantityRow}>
                <View><Text style={styles.fieldLabel}>SASIA</Text><Text style={styles.quantityStock}>{book.stock} në dispozicion</Text></View>
                <View style={styles.quantityControl}>
                  <Pressable
                    accessibilityLabel="Zvogëlo sasinë"
                    disabled={quantity <= 1}
                    onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                    style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                  ><Text style={styles.quantityButtonText}>−</Text></Pressable>
                  <Text style={styles.quantityValue}>{quantity}</Text>
                  <Pressable
                    accessibilityLabel="Rrit sasinë"
                    disabled={quantity >= book.stock}
                    onPress={() => setQuantity((current) => Math.min(book.stock, current + 1))}
                    style={[styles.quantityButton, quantity >= book.stock && styles.quantityButtonDisabled]}
                  ><Text style={styles.quantityButtonText}>＋</Text></Pressable>
                </View>
              </View>

              <Text style={styles.checkoutSectionTitle}>Të dhënat e blerësit</Text>
              <FormField label="EMRI I PLOTË" value={name} onChangeText={setName} placeholder="Emri dhe mbiemri" autoCapitalize="words" />
              <FormField label="EMAIL" value={email} onChangeText={setEmail} placeholder="emri@shembull.com" keyboardType="email-address" autoCapitalize="none" />
              <FormField label="TELEFONI" value={phone} onChangeText={setPhone} placeholder="+355 6X XXX XXXX" keyboardType="phone-pad" />
              <FormField label="ADRESA E DËRGESËS" value={address} onChangeText={setAddress} placeholder="Rruga, qyteti" />

              <View style={styles.checkoutTotal}>
                <View><Text style={styles.checkoutTotalLabel}>TOTALI I POROSISË</Text><Text style={styles.checkoutTotalNote}>Pagesa nuk kryhet online</Text></View>
                <Text style={styles.checkoutTotalValue}>{money(total)}</Text>
              </View>

              <View style={styles.databaseNotice}>
                <View style={[styles.connectionDot, isConnectedToDatabase && styles.connectionDotActive]} />
                <Text style={styles.databaseNoticeText}>
                  {isConnectedToDatabase
                    ? 'Porosia do të ruhet në MySQL; konfirmimi shfaqet pas përgjigjes së serverit.'
                    : 'API-ja nuk është konfiguruar. Vendos EXPO_PUBLIC_API_URL para porosisë.'}
                </Text>
              </View>
              {!!error && <Text style={styles.formError}>{error}</Text>}
              <Pressable disabled={submitting || book.stock < 1} onPress={placeOrder} style={[styles.saveButton, (submitting || book.stock < 1) && styles.checkoutSubmitDisabled]}>
                {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}>{book.stock < 1 ? 'Nuk ka kopje në stok' : 'Konfirmo porosinë'}</Text>}
                {!submitting && <Text style={styles.buyButtonArrow}>→</Text>}
              </Pressable>
              <Text style={styles.checkoutDisclaimer}>Projekt edukativ · pa pagesë reale</Text>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function FormField({ label, multiline = false, ...inputProps }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        multiline={multiline}
        placeholderTextColor={COLORS.muted}
        style={[styles.fieldInput, multiline && styles.multilineInput]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.paper },
  page: { paddingHorizontal: 22, paddingBottom: 36 },
  topBar: { height: 70, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.line },
  brandMark: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: COLORS.white, fontSize: 22, fontWeight: '700', fontFamily: 'Georgia' },
  brandCopy: { marginLeft: 10, flex: 1 },
  brandName: { color: COLORS.ink, fontSize: 11, fontWeight: '800' },
  brandSub: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  addButton: { width: 42, height: 42, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { color: COLORS.white, fontSize: 27, lineHeight: 30, fontWeight: '300' },
  intro: { paddingTop: 31, paddingBottom: 20 },
  eyebrow: { fontSize: 9, color: COLORS.coral, fontWeight: '800' },
  heading: { marginTop: 8, color: COLORS.ink, fontSize: 33, lineHeight: 38, fontFamily: 'Georgia' },
  introFoot: { marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  introCaption: { color: COLORS.muted, fontSize: 12 },
  bookCount: { fontSize: 9, fontWeight: '800', color: COLORS.green },
  searchBox: { minHeight: 48, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderRadius: 5 },
  searchIcon: { fontSize: 24, color: COLORS.green, marginRight: 8, lineHeight: 28 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.ink, paddingVertical: 10 },
  clearSearch: { color: COLORS.muted, fontSize: 23, paddingHorizontal: 4 },
  categoryRow: { paddingTop: 17, paddingBottom: 21, gap: 7 },
  categoryChip: { paddingHorizontal: 13, height: 31, borderWidth: 1, borderColor: COLORS.line, borderRadius: 17, justifyContent: 'center' },
  categoryChipActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  categoryText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  categoryTextActive: { color: COLORS.white },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 22 },
  resultCount: { color: COLORS.muted, fontSize: 10 },
  loader: { paddingVertical: 45 },
  emptyState: { paddingVertical: 40, alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 5 },
  emptyTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 19 },
  emptyCopy: { color: COLORS.muted, fontSize: 12, marginTop: 8 },
  connectionError: { padding: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderLeftWidth: 3, borderLeftColor: COLORS.coral, borderRadius: 5 },
  connectionErrorTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 18 },
  connectionErrorMessage: { color: COLORS.coral, fontSize: 11, lineHeight: 16, marginTop: 9 },
  connectionErrorHint: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 8 },
  retryButton: { height: 42, backgroundColor: COLORS.green, borderRadius: 4, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15 },
  retryButtonText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  bookList: { gap: 11 },
  bookRow: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 5, padding: 11 },
  bookMain: { flexDirection: 'row', alignItems: 'center' },
  cover: { width: 112, height: 158, backgroundColor: COLORS.green, padding: 12, justifyContent: 'space-between', overflow: 'hidden' },
  coverCompact: { width: 66, height: 92, padding: 8 },
  coverLine: { width: 23, height: 2, backgroundColor: 'rgba(255,255,255,0.65)' },
  coverTextWrap: { flex: 1, justifyContent: 'center' },
  coverTitle: { color: COLORS.white, fontFamily: 'Georgia', fontSize: 15, lineHeight: 18 },
  coverTitleCompact: { fontSize: 9, lineHeight: 11 },
  coverAuthor: { color: 'rgba(255,255,255,0.76)', fontSize: 8, marginTop: 7 },
  coverSeal: { width: 17, height: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)', borderRadius: 9, justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end' },
  coverSealText: { color: COLORS.white, fontSize: 8, fontFamily: 'Georgia' },
  bookInfo: { flex: 1, paddingLeft: 12, paddingRight: 4 },
  bookCategory: { color: COLORS.coral, fontSize: 8, fontWeight: '800' },
  bookTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 15, lineHeight: 19, marginTop: 4 },
  bookAuthor: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  bookMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  bookPrice: { color: COLORS.green, fontWeight: '800', fontSize: 11 },
  metaDot: { color: COLORS.muted, marginHorizontal: 5 },
  stockText: { color: COLORS.muted, fontSize: 9 },
  lowStock: { color: COLORS.coral },
  openArrow: { color: COLORS.green, fontSize: 24, paddingLeft: 3 },
  rowActions: { height: 34, borderTopWidth: 1, borderTopColor: COLORS.line, marginTop: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end' },
  rowAction: { paddingHorizontal: 8, paddingVertical: 4 },
  rowActionText: { color: COLORS.green, fontSize: 10, fontWeight: '700' },
  deleteText: { color: COLORS.coral },
  actionDivider: { height: 14, width: 1, backgroundColor: COLORS.line },
  footer: { paddingTop: 29, alignItems: 'center' },
  footerRule: { height: 1, backgroundColor: COLORS.line, width: '100%', marginBottom: 13 },
  footerText: { fontSize: 8, color: COLORS.muted },
  notice: { position: 'absolute', bottom: 20, alignSelf: 'center', overflow: 'hidden', backgroundColor: COLORS.ink, color: COLORS.white, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 5, fontSize: 12 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(24,34,29,0.4)' },
  detailsSheet: { backgroundColor: COLORS.paper, paddingHorizontal: 22, paddingTop: 11, paddingBottom: 27, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  sheetHandle: { width: 37, height: 4, borderRadius: 2, backgroundColor: '#c9cbc2', alignSelf: 'center', marginBottom: 19 },
  detailsTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  detailsInfo: { flex: 1 },
  detailsTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 21, lineHeight: 26, marginTop: 7 },
  detailsPrice: { color: COLORS.green, fontSize: 16, fontWeight: '800', marginTop: 13 },
  descriptionLabel: { color: COLORS.coral, fontSize: 9, fontWeight: '800', marginTop: 22 },
  description: { color: COLORS.ink, fontSize: 13, lineHeight: 19, marginTop: 7 },
  buyButton: { height: 49, backgroundColor: COLORS.green, marginTop: 21, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 5 },
  buyButtonDisabled: { backgroundColor: COLORS.muted },
  buyButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  buyButtonArrow: { color: COLORS.white, fontSize: 20 },
  demoNote: { color: COLORS.muted, textAlign: 'center', fontSize: 9, marginTop: 9 },
  formSheet: { maxHeight: '92%', backgroundColor: COLORS.paper, paddingHorizontal: 22, paddingTop: 11, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  formHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 25, marginTop: 4 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderRadius: 18 },
  closeButtonText: { color: COLORS.ink, fontSize: 23, lineHeight: 25 },
  formField: { marginBottom: 13 },
  fieldLabel: { fontSize: 8, color: COLORS.muted, fontWeight: '800', marginBottom: 6 },
  fieldInput: { backgroundColor: COLORS.white, minHeight: 43, borderWidth: 1, borderColor: COLORS.line, borderRadius: 4, paddingHorizontal: 11, color: COLORS.ink, fontSize: 13 },
  multilineInput: { minHeight: 74, paddingTop: 10 },
  formCategories: { gap: 6, paddingBottom: 14 },
  formCategory: { borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 15 },
  formCategoryActive: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  formCategoryText: { color: COLORS.muted, fontSize: 10 },
  formCategoryTextActive: { color: COLORS.white },
  numberFields: { flexDirection: 'row', gap: 11 },
  numberField: { flex: 1 },
  formError: { color: COLORS.coral, fontSize: 11, marginBottom: 10 },
  saveButton: { height: 47, backgroundColor: COLORS.green, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 5, marginTop: 3 },
  saveButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  formBottomSpace: { height: 24 },
  checkoutPage: { flex: 1, backgroundColor: COLORS.paper },
  checkoutHeader: { minHeight: 65, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: 'row', alignItems: 'center' },
  checkoutBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  checkoutBackText: { color: COLORS.green, fontSize: 29, lineHeight: 31, marginTop: -3 },
  checkoutHeaderCopy: { flex: 1, marginLeft: 10 },
  checkoutStep: { paddingHorizontal: 9, paddingVertical: 6, backgroundColor: COLORS.greenLight, borderRadius: 3 },
  checkoutStepText: { color: COLORS.green, fontSize: 9, fontWeight: '800' },
  checkoutBody: { flex: 1 },
  checkoutContent: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 35 },
  checkoutTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 33, lineHeight: 38, marginTop: 8, marginBottom: 17 },
  checkoutBook: { padding: 11, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 5, flexDirection: 'row', alignItems: 'center' },
  checkoutBookInfo: { flex: 1, paddingLeft: 13 },
  checkoutBookTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 15, lineHeight: 19, marginTop: 5 },
  checkoutUnitPrice: { color: COLORS.green, fontSize: 10, fontWeight: '700', marginTop: 7 },
  checkoutQuantityRow: { minHeight: 67, borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  quantityStock: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  quantityButton: { width: 34, height: 34, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  quantityButtonDisabled: { opacity: 0.4 },
  quantityButtonText: { color: COLORS.green, fontSize: 18, lineHeight: 22 },
  quantityValue: { minWidth: 18, textAlign: 'center', color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  checkoutSectionTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 19, marginBottom: 14 },
  checkoutTotal: { minHeight: 65, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 13 },
  checkoutTotalLabel: { color: COLORS.ink, fontSize: 10, fontWeight: '800' },
  checkoutTotalNote: { color: COLORS.muted, fontSize: 9, marginTop: 4 },
  checkoutTotalValue: { color: COLORS.green, fontFamily: 'Georgia', fontSize: 21 },
  databaseNotice: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.coral, marginRight: 8 },
  connectionDotActive: { backgroundColor: COLORS.green },
  databaseNoticeText: { flex: 1, color: COLORS.muted, fontSize: 9, lineHeight: 13 },
  checkoutSubmitDisabled: { opacity: 0.6 },
  checkoutDisclaimer: { color: COLORS.muted, fontSize: 9, textAlign: 'center', marginTop: 10 },
  receiptPage: { flex: 1, paddingHorizontal: 25, justifyContent: 'center' },
  receiptMark: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  receiptMarkText: { color: COLORS.green, fontSize: 26, fontWeight: '700' },
  receiptTitle: { color: COLORS.ink, fontFamily: 'Georgia', fontSize: 34, lineHeight: 40, marginTop: 9 },
  receiptCopy: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 11 },
  receiptDetails: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 5, paddingHorizontal: 14, marginTop: 24, marginBottom: 18 },
  receiptLine: { minHeight: 42, borderBottomWidth: 1, borderBottomColor: COLORS.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  receiptLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '800' },
  receiptValue: { flexShrink: 1, color: COLORS.ink, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  receiptTotal: { minHeight: 49, borderBottomWidth: 0 },
  receiptTotalLabel: { color: COLORS.ink, fontSize: 10, fontWeight: '800' },
  receiptTotalValue: { color: COLORS.green, fontFamily: 'Georgia', fontSize: 19 },
});